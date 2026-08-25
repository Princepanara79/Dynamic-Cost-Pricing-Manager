const prisma = require('../lib/prisma');
const CostCalculationService = require('../lib/CostCalculationService');
const { toDecimal, calculatePercentageChange } = require('../utils/decimalUtils');
const { getTenantContext } = require('../middleware/auth');

// GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const {
      search,
      category,
      status = 'active',
      costFilter, // 'increased', 'decreased', 'unchanged'
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const where = { manufacturerId };
    if (status === 'active') {
      where.isArchived = false;
    } else if (status === 'archived') {
      where.isArchived = true;
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { category: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
      include: {
        components: {
          include: {
            component: {
              include: {
                materials: {
                  include: { rawMaterial: true }
                }
              }
            }
          }
        },
        packagingConfig: true,
        clientPrices: {
          include: { client: true }
        },
        _count: {
          select: { sales: true }
        }
      }
    });

    let formatted = products.map(p => {
      const currentCost = toDecimal(p.manufacturingCost).toNumber();
      const prevCost = p.previousManufacturingCost ? toDecimal(p.previousManufacturingCost).toNumber() : null;
      const costDiff = prevCost !== null ? currentCost - prevCost : 0;
      const costDiffPct = prevCost ? ((currentCost - prevCost) / prevCost) * 100 : 0;
      const recPrice = toDecimal(p.recommendedSellingPrice).toNumber();
      const givenPrice = p.givenSellingPrice ? toDecimal(p.givenSellingPrice).toNumber() : null;
      const currentSellingPrice = givenPrice || recPrice;
      const profit = currentSellingPrice - currentCost;
      const profitMargin = currentSellingPrice > 0 ? (profit / currentSellingPrice) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        description: p.description,
        weight: p.weight ? toDecimal(p.weight).toNumber() : null,
        size: p.size,
        materialCost: toDecimal(p.materialCost).toNumber(),
        labourCost: toDecimal(p.labourCost).toNumber(),
        machineCost: toDecimal(p.machineCost).toNumber(),
        manufacturingOverhead: toDecimal(p.manufacturingOverhead).toNumber(),
        otherCost: toDecimal(p.otherCost).toNumber(),
        packagingCost: toDecimal(p.packagingCost).toNumber(),
        transportationCost: toDecimal(p.transportationCost).toNumber(),
        wastagePct: toDecimal(p.wastagePct).toNumber(),
        wastageCost: toDecimal(p.wastageCost).toNumber(),
        manufacturingCost: currentCost,
        previousManufacturingCost: prevCost,
        costDifference: Number(costDiff.toFixed(2)),
        costDifferencePct: Number(costDiffPct.toFixed(2)),
        profitType: p.profitType,
        profitPercentage: toDecimal(p.profitPercentage).toNumber(),
        recommendedSellingPrice: recPrice,
        givenSellingPrice: givenPrice,
        currentSellingPrice,
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2)),
        status: p.status,
        isArchived: p.isArchived,
        componentsCount: p.components.length,
        salesCount: p._count.sales,
        clientPricesCount: p.clientPrices.length,
        lastRecalculatedAt: p.lastRecalculatedAt,
        updatedAt: p.updatedAt
      };
    });

    if (costFilter === 'increased') {
      formatted = formatted.filter(p => p.costDifference > 0);
    } else if (costFilter === 'decreased') {
      formatted = formatted.filter(p => p.costDifference < 0);
    } else if (costFilter === 'unchanged') {
      formatted = formatted.filter(p => p.costDifference === 0);
    }

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/products/:id
const getProductById = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { id: Number(id), manufacturerId },
      include: {
        components: {
          include: {
            component: {
              include: {
                materials: {
                  include: { rawMaterial: true }
                }
              }
            }
          }
        },
        packagingConfig: {
          include: { parent: true, children: true }
        },
        clientPrices: {
          include: { client: true }
        },
        costHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    const currentCost = toDecimal(product.manufacturingCost).toNumber();
    const prevCost = product.previousManufacturingCost ? toDecimal(product.previousManufacturingCost).toNumber() : null;
    const recPrice = toDecimal(product.recommendedSellingPrice).toNumber();
    const givenPrice = product.givenSellingPrice ? toDecimal(product.givenSellingPrice).toNumber() : null;
    const currentSellingPrice = givenPrice || recPrice;
    const profit = currentSellingPrice - currentCost;
    const profitMargin = currentSellingPrice > 0 ? (profit / currentSellingPrice) * 100 : 0;
    const markup = currentCost > 0 ? (profit / currentCost) * 100 : 0;

    const componentHierarchy = product.components.map(pc => {
      const comp = pc.component;
      const compQty = toDecimal(pc.quantity).toNumber();
      const compUnitCost = toDecimal(comp.currentCost).toNumber();
      const compTotalCost = toDecimal(pc.cost).toNumber();

      const rawMaterialsTree = comp.materials.map(cm => {
        const mat = cm.rawMaterial;
        const matQty = toDecimal(cm.quantity).toNumber();
        const matRate = toDecimal(mat.currentPrice).toNumber();
        const matCost = toDecimal(cm.cost).toNumber();

        return {
          id: cm.id,
          rawMaterialId: mat.id,
          name: mat.name,
          category: mat.category,
          quantity: matQty,
          unit: cm.unit,
          rate: matRate,
          materialBaseUnit: mat.unit,
          cost: matCost,
          extendedCostForProduct: Number((matCost * compQty).toFixed(2))
        };
      });

      return {
        id: pc.id,
        componentId: comp.id,
        name: comp.name,
        description: comp.description,
        quantity: compQty,
        unitCost: compUnitCost,
        totalCost: compTotalCost,
        additionalCost: toDecimal(comp.additionalCost).toNumber(),
        rawMaterials: rawMaterialsTree
      };
    });

    res.json({
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      description: product.description,
      weight: product.weight ? toDecimal(product.weight).toNumber() : null,
      size: product.size,
      materialCost: toDecimal(product.materialCost).toNumber(),
      labourCost: toDecimal(product.labourCost).toNumber(),
      machineCost: toDecimal(product.machineCost).toNumber(),
      manufacturingOverhead: toDecimal(product.manufacturingOverhead).toNumber(),
      otherCost: toDecimal(product.otherCost).toNumber(),
      packagingCost: toDecimal(product.packagingCost).toNumber(),
      transportationCost: toDecimal(product.transportationCost).toNumber(),
      wastagePct: toDecimal(product.wastagePct).toNumber(),
      wastageCost: toDecimal(product.wastageCost).toNumber(),
      manufacturingCost: currentCost,
      previousManufacturingCost: prevCost,
      profitType: product.profitType,
      profitPercentage: toDecimal(product.profitPercentage).toNumber(),
      recommendedSellingPrice: recPrice,
      givenSellingPrice: givenPrice,
      currentSellingPrice,
      profit: Number(profit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      markup: Number(markup.toFixed(2)),
      breakEvenPrice: currentCost,
      status: product.status,
      isArchived: product.isArchived,
      lastRecalculatedAt: product.lastRecalculatedAt,
      components: componentHierarchy,
      packagingConfigs: product.packagingConfig.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        level: pkg.level,
        parentId: pkg.parentId,
        unitCost: toDecimal(pkg.unitCost).toNumber(),
        unitsPerParent: pkg.unitsPerParent,
        productsPerUnit: pkg.productsPerUnit
      })),
      clientPrices: product.clientPrices.map(cp => ({
        id: cp.id,
        clientId: cp.clientId,
        clientName: cp.client.name,
        clientCode: cp.client.code,
        sellingPrice: toDecimal(cp.sellingPrice).toNumber(),
        profit: toDecimal(cp.profit).toNumber(),
        markup: toDecimal(cp.markup).toNumber(),
        profitMargin: toDecimal(cp.profitMargin).toNumber()
      })),
      costHistory: product.costHistory.map(ch => ({
        id: ch.id,
        previousCost: toDecimal(ch.previousCost).toNumber(),
        newCost: toDecimal(ch.newCost).toNumber(),
        difference: toDecimal(ch.difference).toNumber(),
        differencePct: toDecimal(ch.differencePct).toNumber(),
        previousRecommendedPrice: ch.previousRecommendedPrice ? toDecimal(ch.previousRecommendedPrice).toNumber() : null,
        newRecommendedPrice: ch.newRecommendedPrice ? toDecimal(ch.newRecommendedPrice).toNumber() : null,
        reason: ch.reason,
        changedAt: ch.changedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const { manufacturerId, userId } = getTenantContext(req);
    const {
      name,
      sku,
      category,
      description,
      weight,
      size,
      components = [],
      labourCost = 0,
      machineCost = 0,
      manufacturingOverhead = 0,
      otherCost = 0,
      transportationCost = 0,
      packagingConfigs = [],
      packagingCost: manualPackagingCost = 0,
      wastagePct = 0,
      profitType = 'markup',
      profitPercentage = 0,
      givenSellingPrice = null
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Product name and SKU are required' });
    }

    if (!components || components.length === 0) {
      return res.status(400).json({ error: 'Product must contain at least one component' });
    }

    // Check unique SKU for this manufacturer
    const existingSku = await prisma.product.findUnique({ 
      where: { manufacturerId_sku: { manufacturerId, sku } } 
    });
    if (existingSku) {
      return res.status(400).json({ error: `SKU '${sku}' is already in use by another product` });
    }

    // Ensure components belong to manufacturer
    const componentIds = [...new Set(components.map(c => Number(c.componentId)))];
    const compList = await prisma.component.findMany({
      where: { id: { in: componentIds }, manufacturerId }
    });
    
    if (compList.length !== componentIds.length) {
      return res.status(403).json({ error: 'One or more components do not exist or belong to another manufacturer.' });
    }
    
    const compMap = new Map(compList.map(c => [c.id, c]));

    let calculatedProductMatCost = toDecimal(0);
    const calculatedComponents = [];

    for (const item of components) {
      const comp = compMap.get(Number(item.componentId));
      if (!comp) {
        return res.status(400).json({ error: `Component #${item.componentId} not found` });
      }

      const qty = toDecimal(item.quantity || 1);
      if (qty.lessThanOrEqualTo(0)) {
        return res.status(400).json({ error: `Quantity for component '${comp.name}' must be greater than zero` });
      }

      const lineCost = qty.times(toDecimal(comp.currentCost));
      calculatedProductMatCost = calculatedProductMatCost.plus(lineCost);

      calculatedComponents.push({
        componentId: comp.id,
        quantity: qty,
        cost: lineCost
      });
    }

    let packagingCost = toDecimal(manualPackagingCost);
    if (packagingConfigs && packagingConfigs.length > 0) {
      packagingCost = CostCalculationService.calculatePackagingCostPerProduct(packagingConfigs);
    }

    const mfgResult = CostCalculationService.calculateManufacturingCost({
      materialCost: calculatedProductMatCost,
      labourCost,
      machineCost,
      manufacturingOverhead,
      otherCost,
      packagingCost,
      transportationCost,
      wastagePct
    });

    const pricing = CostCalculationService.calculatePricing({
      cost: mfgResult.totalManufacturingCost,
      profitType,
      profitPercentage,
      givenSellingPrice
    });

    const product = await prisma.product.create({
      data: {
        manufacturerId,
        name,
        sku,
        category,
        description,
        weight: weight ? toDecimal(weight) : null,
        size,
        labourCost: mfgResult.labourCost,
        machineCost: mfgResult.machineCost,
        manufacturingOverhead: mfgResult.manufacturingOverhead,
        otherCost: mfgResult.otherCost,
        packagingCost: mfgResult.packagingCost,
        transportationCost: mfgResult.transportationCost,
        wastagePct: mfgResult.wastagePct,
        wastageCost: mfgResult.wastageCost,
        materialCost: mfgResult.materialCost,
        manufacturingCost: mfgResult.totalManufacturingCost,
        profitType,
        profitPercentage: toDecimal(profitPercentage),
        givenSellingPrice: givenSellingPrice ? toDecimal(givenSellingPrice) : null,
        recommendedSellingPrice: pricing.sellingPrice,
        lastRecalculatedAt: new Date(),
        components: {
          create: calculatedComponents
        },
        packagingConfig: {
          create: packagingConfigs.map(pkg => ({
            name: pkg.name,
            level: pkg.level || 0,
            unitCost: toDecimal(pkg.unitCost || 0),
            unitsPerParent: Number(pkg.unitsPerParent || 1),
            productsPerUnit: Number(pkg.productsPerUnit || 1)
          }))
        }
      },
      include: {
        components: { include: { component: true } },
        packagingConfig: true
      }
    });

    await prisma.auditLog.create({
      data: {
        manufacturerId,
        userId,
        action: 'CREATE',
        entity: 'Product',
        entityId: product.id,
        details: `Created product '${name}' (${sku}) with manufacturing cost ₹${mfgResult.totalManufacturingCost.toFixed(2)}`
      }
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const {
      name,
      sku,
      category,
      description,
      weight,
      size,
      components = [],
      labourCost = 0,
      machineCost = 0,
      manufacturingOverhead = 0,
      otherCost = 0,
      transportationCost = 0,
      packagingConfigs = [],
      packagingCost: manualPackagingCost = 0,
      wastagePct = 0,
      profitType = 'markup',
      profitPercentage = 0,
      givenSellingPrice = null
    } = req.body;

    const existing = await prisma.product.findFirst({
      where: { id: Number(id), manufacturerId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    if (sku && sku !== existing.sku) {
      const duplicateSku = await prisma.product.findUnique({ 
        where: { manufacturerId_sku: { manufacturerId, sku } } 
      });
      if (duplicateSku) {
        return res.status(400).json({ error: `SKU '${sku}' is already in use` });
      }
    }

    if (!components || components.length === 0) {
      return res.status(400).json({ error: 'Product must contain at least one component' });
    }

    // Verify component ownership
    const componentIds = [...new Set(components.map(c => Number(c.componentId)))];
    const compList = await prisma.component.findMany({
      where: { id: { in: componentIds }, manufacturerId }
    });
    
    if (compList.length !== componentIds.length) {
      return res.status(403).json({ error: 'One or more components do not exist or belong to another manufacturer.' });
    }
    
    const compMap = new Map(compList.map(c => [c.id, c]));

    let calculatedProductMatCost = toDecimal(0);
    const calculatedComponents = [];

    for (const item of components) {
      const comp = compMap.get(Number(item.componentId));
      if (!comp) {
        return res.status(400).json({ error: `Component #${item.componentId} not found` });
      }

      const qty = toDecimal(item.quantity || 1);
      if (qty.lessThanOrEqualTo(0)) {
        return res.status(400).json({ error: `Quantity for component '${comp.name}' must be greater than zero` });
      }

      const lineCost = qty.times(toDecimal(comp.currentCost));
      calculatedProductMatCost = calculatedProductMatCost.plus(lineCost);

      calculatedComponents.push({
        productId: Number(id),
        componentId: comp.id,
        quantity: qty,
        cost: lineCost
      });
    }

    let packagingCost = toDecimal(manualPackagingCost);
    if (packagingConfigs && packagingConfigs.length > 0) {
      packagingCost = CostCalculationService.calculatePackagingCostPerProduct(packagingConfigs);
    }

    const mfgResult = CostCalculationService.calculateManufacturingCost({
      materialCost: calculatedProductMatCost,
      labourCost,
      machineCost,
      manufacturingOverhead,
      otherCost,
      packagingCost,
      transportationCost,
      wastagePct
    });

    const pricing = CostCalculationService.calculatePricing({
      cost: mfgResult.totalManufacturingCost,
      profitType,
      profitPercentage,
      givenSellingPrice
    });

    const oldCost = toDecimal(existing.manufacturingCost);
    const newCost = mfgResult.totalManufacturingCost;

    await prisma.$transaction(async (tx) => {
      // Refresh components
      await tx.productComponent.deleteMany({ where: { productId: Number(id) } });
      await tx.productComponent.createMany({ data: calculatedComponents });

      // Refresh packaging configs
      if (packagingConfigs) {
        await tx.packagingConfig.deleteMany({ where: { productId: Number(id) } });
        if (packagingConfigs.length > 0) {
          await tx.packagingConfig.createMany({
            data: packagingConfigs.map(pkg => ({
              productId: Number(id),
              name: pkg.name,
              level: pkg.level || 0,
              unitCost: toDecimal(pkg.unitCost || 0),
              unitsPerParent: Number(pkg.unitsPerParent || 1),
              productsPerUnit: Number(pkg.productsPerUnit || 1)
            }))
          });
        }
      }

      // Update product
      await tx.product.update({
        where: { id: Number(id) },
        data: {
          name: name || existing.name,
          sku: sku || existing.sku,
          category: category !== undefined ? category : existing.category,
          description: description !== undefined ? description : existing.description,
          weight: weight ? toDecimal(weight) : null,
          size: size !== undefined ? size : existing.size,
          labourCost: mfgResult.labourCost,
          machineCost: mfgResult.machineCost,
          manufacturingOverhead: mfgResult.manufacturingOverhead,
          otherCost: mfgResult.otherCost,
          packagingCost: mfgResult.packagingCost,
          transportationCost: mfgResult.transportationCost,
          wastagePct: mfgResult.wastagePct,
          wastageCost: mfgResult.wastageCost,
          materialCost: mfgResult.materialCost,
          manufacturingCost: newCost,
          previousManufacturingCost: oldCost,
          profitType,
          profitPercentage: toDecimal(profitPercentage),
          givenSellingPrice: givenSellingPrice ? toDecimal(givenSellingPrice) : null,
          recommendedSellingPrice: pricing.sellingPrice,
          lastRecalculatedAt: new Date(),
          updatedAt: new Date()
        }
      });
    });

    const updated = await prisma.product.findFirst({
      where: { id: Number(id), manufacturerId },
      include: {
        components: { include: { component: true } },
        packagingConfig: true
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// POST /api/products/:id/duplicate
const duplicateProduct = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const source = await prisma.product.findFirst({
      where: { id: Number(id), manufacturerId },
      include: {
        components: true,
        packagingConfig: true
      }
    });

    if (!source) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    const uniqueSku = `${source.sku}-COPY-${Date.now().toString().slice(-4)}`;

    const duplicated = await prisma.product.create({
      data: {
        manufacturerId,
        name: `${source.name} (Copy)`,
        sku: uniqueSku,
        category: source.category,
        description: source.description,
        weight: source.weight,
        size: source.size,
        materialCost: source.materialCost,
        labourCost: source.labourCost,
        machineCost: source.machineCost,
        manufacturingOverhead: source.manufacturingOverhead,
        otherCost: source.otherCost,
        packagingCost: source.packagingCost,
        transportationCost: source.transportationCost,
        wastagePct: source.wastagePct,
        wastageCost: source.wastageCost,
        manufacturingCost: source.manufacturingCost,
        profitType: source.profitType,
        profitPercentage: source.profitPercentage,
        recommendedSellingPrice: source.recommendedSellingPrice,
        givenSellingPrice: source.givenSellingPrice,
        components: {
          create: source.components.map(c => ({
            componentId: c.componentId,
            quantity: c.quantity,
            cost: c.cost
          }))
        },
        packagingConfig: {
          create: source.packagingConfig.map(pkg => ({
            name: pkg.name,
            level: pkg.level,
            unitCost: pkg.unitCost,
            unitsPerParent: pkg.unitsPerParent,
            productsPerUnit: pkg.productsPerUnit
          }))
        }
      },
      include: {
        components: { include: { component: true } }
      }
    });

    res.status(201).json(duplicated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const prodId = Number(id);

    const existing = await prisma.product.findFirst({
      where: { id: prodId, manufacturerId },
      include: {
        _count: { select: { sales: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    if (existing._count.sales > 0) {
      const archived = await prisma.product.update({
        where: { id: prodId },
        data: { isArchived: true, status: 'archived', archivedAt: new Date() }
      });
      return res.json({
        message: `Product has ${existing._count.sales} historical sales and has been archived.`,
        archived: true,
        product: archived
      });
    }

    await prisma.clientProductPrice.deleteMany({ where: { productId: prodId } });
    await prisma.costChangeHistory.deleteMany({ where: { productId: prodId } });
    await prisma.packagingConfig.deleteMany({ where: { productId: prodId } });
    await prisma.productComponent.deleteMany({ where: { productId: prodId } });
    await prisma.product.delete({ where: { id: prodId } });

    res.json({ message: 'Product deleted successfully', deleted: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/comparison
const getProductCostComparison = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { filter = 'all' } = req.query;

    const products = await prisma.product.findMany({
      where: { isArchived: false, manufacturerId },
      orderBy: { name: 'asc' }
    });

    let list = products.map(p => {
      const newCost = toDecimal(p.manufacturingCost).toNumber();
      const oldCost = p.previousManufacturingCost ? toDecimal(p.previousManufacturingCost).toNumber() : newCost;
      const diff = Number((newCost - oldCost).toFixed(2));
      const diffPct = oldCost > 0 ? Number(((diff / oldCost) * 100).toFixed(2)) : 0;
      const newRec = toDecimal(p.recommendedSellingPrice).toNumber();
      
      const oldPricing = CostCalculationService.calculatePricing({
        cost: oldCost,
        profitType: p.profitType,
        profitPercentage: p.profitPercentage,
        givenSellingPrice: p.givenSellingPrice
      });
      const oldRec = toDecimal(oldPricing.sellingPrice).toNumber();

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        oldCost,
        newCost,
        difference: diff,
        differencePct: diffPct,
        oldRecommendedPrice: oldRec,
        newRecommendedPrice: newRec,
        status: diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'unchanged'
      };
    });

    if (filter === 'increased') {
      list = list.filter(p => p.difference > 0);
    } else if (filter === 'decreased') {
      list = list.filter(p => p.difference < 0);
    } else if (filter === 'unchanged') {
      list = list.filter(p => p.difference === 0);
    } else if (filter === 'highest_increase') {
      list.sort((a, b) => b.difference - a.difference);
    } else if (filter === 'highest_pct_increase') {
      list.sort((a, b) => b.differencePct - a.differencePct);
    }

    res.json(list);
  } catch (error) {
    next(error);
  }
};

// GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const categories = await prisma.product.findMany({
      where: { manufacturerId },
      select: { category: true },
      distinct: ['category']
    });
    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  getProductCostComparison,
  getCategories
};
