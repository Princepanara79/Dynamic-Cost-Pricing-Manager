const prisma = require('../lib/prisma');
const CostCalculationService = require('../lib/CostCalculationService');
const { toDecimal, calculatePercentageChange } = require('../utils/decimalUtils');

// GET /api/components
const getComponents = async (req, res, next) => {
  try {
    const { search, status = 'active', sortBy = 'name', sortOrder = 'asc' } = req.query;

    const where = {};
    if (status === 'active') {
      where.isArchived = false;
    } else if (status === 'archived') {
      where.isArchived = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const components = await prisma.component.findMany({
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
      include: {
        materials: {
          include: {
            rawMaterial: true
          }
        },
        _count: {
          select: { productComponents: true }
        }
      }
    });

    const formatted = components.map(c => {
      const materialCount = c.materials.length;
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        additionalCost: toDecimal(c.additionalCost).toNumber(),
        currentCost: toDecimal(c.currentCost).toNumber(),
        previousCost: c.previousCost ? toDecimal(c.previousCost).toNumber() : null,
        status: c.status,
        isArchived: c.isArchived,
        updatedAt: c.updatedAt,
        materialsCount: materialCount,
        productsCount: c._count.productComponents,
        materials: c.materials.map(m => ({
          id: m.id,
          rawMaterialId: m.rawMaterialId,
          name: m.rawMaterial.name,
          category: m.rawMaterial.category,
          quantity: toDecimal(m.quantity).toNumber(),
          unit: m.unit,
          rate: toDecimal(m.rawMaterial.currentPrice).toNumber(),
          materialUnit: m.rawMaterial.unit,
          cost: toDecimal(m.cost).toNumber()
        }))
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/components/:id
const getComponentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const component = await prisma.component.findUnique({
      where: { id: Number(id) },
      include: {
        materials: {
          include: {
            rawMaterial: true
          }
        },
        productComponents: {
          include: {
            product: true
          }
        }
      }
    });

    if (!component) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({
      id: component.id,
      name: component.name,
      description: component.description,
      additionalCost: toDecimal(component.additionalCost).toNumber(),
      currentCost: toDecimal(component.currentCost).toNumber(),
      previousCost: component.previousCost ? toDecimal(component.previousCost).toNumber() : null,
      status: component.status,
      isArchived: component.isArchived,
      updatedAt: component.updatedAt,
      materials: component.materials.map(m => ({
        id: m.id,
        rawMaterialId: m.rawMaterialId,
        rawMaterialName: m.rawMaterial.name,
        category: m.rawMaterial.category,
        quantity: toDecimal(m.quantity).toNumber(),
        unit: m.unit,
        rate: toDecimal(m.rawMaterial.currentPrice).toNumber(),
        materialUnit: m.rawMaterial.unit,
        cost: toDecimal(m.cost).toNumber()
      })),
      products: component.productComponents.map(pc => ({
        id: pc.product.id,
        name: pc.product.name,
        sku: pc.product.sku,
        quantityUsed: toDecimal(pc.quantity).toNumber(),
        manufacturingCost: toDecimal(pc.product.manufacturingCost).toNumber(),
        recommendedSellingPrice: toDecimal(pc.product.recommendedSellingPrice).toNumber()
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/components
const createComponent = async (req, res, next) => {
  try {
    const { name, description, additionalCost = 0, materials = [] } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Component name is required' });
    }

    if (!materials || materials.length === 0) {
      return res.status(400).json({ error: 'At least one raw material is required for the component BOM' });
    }

    // Fetch raw materials to verify rates
    const rawMaterialIds = materials.map(m => Number(m.rawMaterialId));
    const rawMaterialsList = await prisma.rawMaterial.findMany({
      where: { id: { in: rawMaterialIds } }
    });
    const rmMap = new Map(rawMaterialsList.map(r => [r.id, r]));

    const calculatedMaterials = [];
    let totalMaterialCost = toDecimal(0);

    for (const item of materials) {
      const rm = rmMap.get(Number(item.rawMaterialId));
      if (!rm) {
        return res.status(400).json({ error: `Raw material #${item.rawMaterialId} not found` });
      }

      const qty = toDecimal(item.quantity);
      if (qty.lessThanOrEqualTo(0)) {
        return res.status(400).json({ error: `Quantity for material '${rm.name}' must be greater than zero` });
      }

      const unit = (item.unit || rm.unit).toLowerCase();
      const lineCost = CostCalculationService.calculateRawMaterialCost(
        qty,
        unit,
        toDecimal(rm.currentPrice),
        rm.unit
      );

      totalMaterialCost = totalMaterialCost.plus(lineCost);
      calculatedMaterials.push({
        rawMaterialId: rm.id,
        quantity: qty,
        unit: unit,
        cost: lineCost
      });
    }

    const addCost = toDecimal(additionalCost);
    const totalComponentCost = totalMaterialCost.plus(addCost);

    const component = await prisma.component.create({
      data: {
        name,
        description,
        additionalCost: addCost,
        currentCost: totalComponentCost,
        materials: {
          create: calculatedMaterials
        }
      },
      include: {
        materials: {
          include: { rawMaterial: true }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Component',
        entityId: component.id,
        details: `Created component '${name}' with total cost ₹${totalComponentCost.toFixed(2)}`
      }
    });

    res.status(201).json(component);
  } catch (error) {
    next(error);
  }
};

// PUT /api/components/:id
const updateComponent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, additionalCost = 0, materials = [] } = req.body;

    const existing = await prisma.component.findUnique({
      where: { id: Number(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Component not found' });
    }

    if (!materials || materials.length === 0) {
      return res.status(400).json({ error: 'At least one raw material is required for the component BOM' });
    }

    const rawMaterialIds = materials.map(m => Number(m.rawMaterialId));
    const rawMaterialsList = await prisma.rawMaterial.findMany({
      where: { id: { in: rawMaterialIds } }
    });
    const rmMap = new Map(rawMaterialsList.map(r => [r.id, r]));

    const calculatedMaterials = [];
    let totalMaterialCost = toDecimal(0);

    for (const item of materials) {
      const rm = rmMap.get(Number(item.rawMaterialId));
      if (!rm) {
        return res.status(400).json({ error: `Raw material #${item.rawMaterialId} not found` });
      }

      const qty = toDecimal(item.quantity);
      if (qty.lessThanOrEqualTo(0)) {
        return res.status(400).json({ error: `Quantity for material '${rm.name}' must be greater than zero` });
      }

      const unit = (item.unit || rm.unit).toLowerCase();
      const lineCost = CostCalculationService.calculateRawMaterialCost(
        qty,
        unit,
        toDecimal(rm.currentPrice),
        rm.unit
      );

      totalMaterialCost = totalMaterialCost.plus(lineCost);
      calculatedMaterials.push({
        componentId: Number(id),
        rawMaterialId: rm.id,
        quantity: qty,
        unit: unit,
        cost: lineCost
      });
    }

    const addCost = toDecimal(additionalCost);
    const totalComponentCost = totalMaterialCost.plus(addCost);
    const oldCost = toDecimal(existing.currentCost);

    // Delete existing materials and recreate inside transaction
    await prisma.$transaction(async (tx) => {
      await tx.componentMaterial.deleteMany({
        where: { componentId: Number(id) }
      });

      await tx.componentMaterial.createMany({
        data: calculatedMaterials
      });

      await tx.component.update({
        where: { id: Number(id) },
        data: {
          name: name || existing.name,
          description: description !== undefined ? description : existing.description,
          additionalCost: addCost,
          currentCost: totalComponentCost,
          previousCost: oldCost,
          updatedAt: new Date()
        }
      });
    });

    // If cost changed, recalculate all parent products!
    const parentProducts = await prisma.product.findMany({
      where: {
        isArchived: false,
        components: { some: { componentId: Number(id) } }
      },
      include: {
        components: { include: { component: true } },
        packagingConfig: true
      }
    });

    for (const prod of parentProducts) {
      let newProdMatCost = toDecimal(0);
      for (const pc of prod.components) {
        const compCost = pc.componentId === Number(id)
          ? totalComponentCost
          : toDecimal(pc.component.currentCost);
        const lineCost = toDecimal(pc.quantity).times(compCost);
        newProdMatCost = newProdMatCost.plus(lineCost);

        if (pc.componentId === Number(id)) {
          await prisma.productComponent.update({
            where: { id: pc.id },
            data: { cost: lineCost }
          });
        }
      }

      const packagingCost = prod.packagingConfig?.length > 0
        ? CostCalculationService.calculatePackagingCostPerProduct(prod.packagingConfig)
        : toDecimal(prod.packagingCost);

      const mfgResult = CostCalculationService.calculateManufacturingCost({
        materialCost: newProdMatCost,
        labourCost: prod.labourCost,
        machineCost: prod.machineCost,
        manufacturingOverhead: prod.manufacturingOverhead,
        otherCost: prod.otherCost,
        packagingCost,
        transportationCost: prod.transportationCost,
        wastagePct: prod.wastagePct
      });

      const pricing = CostCalculationService.calculatePricing({
        cost: mfgResult.totalManufacturingCost,
        profitType: prod.profitType,
        profitPercentage: prod.profitPercentage,
        givenSellingPrice: prod.givenSellingPrice
      });

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          materialCost: mfgResult.materialCost,
          wastageCost: mfgResult.wastageCost,
          packagingCost: mfgResult.packagingCost,
          manufacturingCost: mfgResult.totalManufacturingCost,
          previousManufacturingCost: prod.manufacturingCost,
          recommendedSellingPrice: pricing.sellingPrice,
          lastRecalculatedAt: new Date()
        }
      });
    }

    const updated = await prisma.component.findUnique({
      where: { id: Number(id) },
      include: {
        materials: { include: { rawMaterial: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// POST /api/components/:id/duplicate
const duplicateComponent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const source = await prisma.component.findUnique({
      where: { id: Number(id) },
      include: { materials: true }
    });

    if (!source) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const duplicated = await prisma.component.create({
      data: {
        name: `${source.name} (Copy)`,
        description: source.description,
        additionalCost: source.additionalCost,
        currentCost: source.currentCost,
        materials: {
          create: source.materials.map(m => ({
            rawMaterialId: m.rawMaterialId,
            quantity: m.quantity,
            unit: m.unit,
            cost: m.cost
          }))
        }
      },
      include: {
        materials: { include: { rawMaterial: true } }
      }
    });

    res.status(201).json(duplicated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/components/:id
const deleteComponent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const compId = Number(id);

    const existing = await prisma.component.findUnique({
      where: { id: compId },
      include: {
        _count: { select: { productComponents: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Component not found' });
    }

    if (existing._count.productComponents > 0) {
      const archived = await prisma.component.update({
        where: { id: compId },
        data: { isArchived: true, status: 'archived', archivedAt: new Date() }
      });
      return res.json({
        message: `Component is used in ${existing._count.productComponents} products and has been archived.`,
        archived: true,
        component: archived
      });
    }

    await prisma.componentMaterial.deleteMany({ where: { componentId: compId } });
    await prisma.component.delete({ where: { id: compId } });

    res.json({ message: 'Component deleted successfully', deleted: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComponents,
  getComponentById,
  createComponent,
  updateComponent,
  duplicateComponent,
  deleteComponent
};
