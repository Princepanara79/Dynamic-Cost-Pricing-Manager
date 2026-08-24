const prisma = require('../lib/prisma');
const CostCalculationService = require('../lib/CostCalculationService');
const { toDecimal, calculatePercentageChange } = require('../utils/decimalUtils');

// GET /api/raw-materials
const getRawMaterials = async (req, res, next) => {
  try {
    const { search, category, status = 'active', sortBy = 'name', sortOrder = 'asc' } = req.query;

    const where = {};
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
        { category: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
      include: {
        _count: {
          select: { componentMaterials: true }
        }
      }
    });

    const formatted = rawMaterials.map(rm => ({
      ...rm,
      currentPrice: toDecimal(rm.currentPrice).toNumber(),
      previousPrice: rm.previousPrice ? toDecimal(rm.previousPrice).toNumber() : null,
      priceChange: rm.priceChange ? toDecimal(rm.priceChange).toNumber() : 0,
      priceChangePct: rm.priceChangePct ? toDecimal(rm.priceChangePct).toNumber() : 0,
      componentsCount: rm._count.componentMaterials
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/raw-materials/:id
const getRawMaterialById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: Number(id) },
      include: {
        priceHistory: {
          orderBy: { changedAt: 'desc' },
          take: 30
        },
        componentMaterials: {
          include: {
            component: {
              include: {
                productComponents: {
                  include: {
                    product: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!rawMaterial) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    // Extract unique affected components and products
    const componentsMap = new Map();
    const productsMap = new Map();

    for (const cm of rawMaterial.componentMaterials) {
      if (cm.component && !cm.component.isArchived) {
        componentsMap.set(cm.component.id, {
          id: cm.component.id,
          name: cm.component.name,
          currentCost: toDecimal(cm.component.currentCost).toNumber(),
          quantityUsed: toDecimal(cm.quantity).toNumber(),
          unitUsed: cm.unit
        });

        for (const pc of cm.component.productComponents) {
          if (pc.product && !pc.product.isArchived) {
            productsMap.set(pc.product.id, {
              id: pc.product.id,
              name: pc.product.name,
              sku: pc.product.sku,
              manufacturingCost: toDecimal(pc.product.manufacturingCost).toNumber(),
              recommendedSellingPrice: toDecimal(pc.product.recommendedSellingPrice).toNumber()
            });
          }
        }
      }
    }

    res.json({
      ...rawMaterial,
      currentPrice: toDecimal(rawMaterial.currentPrice).toNumber(),
      previousPrice: rawMaterial.previousPrice ? toDecimal(rawMaterial.previousPrice).toNumber() : null,
      priceChange: rawMaterial.priceChange ? toDecimal(rawMaterial.priceChange).toNumber() : 0,
      priceChangePct: rawMaterial.priceChangePct ? toDecimal(rawMaterial.priceChangePct).toNumber() : 0,
      affectedComponents: Array.from(componentsMap.values()),
      affectedProducts: Array.from(productsMap.values()),
      priceHistory: rawMaterial.priceHistory.map(ph => ({
        id: ph.id,
        previousPrice: toDecimal(ph.previousPrice).toNumber(),
        newPrice: toDecimal(ph.newPrice).toNumber(),
        difference: toDecimal(ph.difference).toNumber(),
        changePct: toDecimal(ph.changePct).toNumber(),
        changedAt: ph.changedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/raw-materials
const createRawMaterial = async (req, res, next) => {
  try {
    const { name, category, unit, currentPrice, description } = req.body;

    if (!name || !category || !unit || currentPrice === undefined || currentPrice === null) {
      return res.status(400).json({ error: 'Name, category, unit, and current price are required' });
    }

    const price = toDecimal(currentPrice);
    if (price.isNegative()) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const newMaterial = await prisma.rawMaterial.create({
      data: {
        name,
        category,
        unit: unit.toLowerCase(),
        currentPrice: price,
        description,
        priceHistory: {
          create: {
            previousPrice: price,
            newPrice: price,
            difference: 0,
            changePct: 0
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'RawMaterial',
        entityId: newMaterial.id,
        newValue: JSON.stringify(newMaterial),
        details: `Created raw material ${name} at ₹${price}/${unit}`
      }
    });

    res.status(201).json({
      ...newMaterial,
      currentPrice: price.toNumber()
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/raw-materials/:id
const updateRawMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, unit, description } = req.body;

    const existing = await prisma.rawMaterial.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    const updated = await prisma.rawMaterial.update({
      where: { id: Number(id) },
      data: {
        name: name !== undefined ? name : existing.name,
        category: category !== undefined ? category : existing.category,
        unit: unit !== undefined ? unit.toLowerCase() : existing.unit,
        description: description !== undefined ? description : existing.description
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'RawMaterial',
        entityId: updated.id,
        oldValue: JSON.stringify(existing),
        newValue: JSON.stringify(updated),
        details: `Updated raw material details for ${updated.name}`
      }
    });

    res.json({
      ...updated,
      currentPrice: toDecimal(updated.currentPrice).toNumber()
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/raw-materials/:id/impact-preview?newPrice=...
const previewPriceImpact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPrice } = req.query;

    if (!newPrice || isNaN(Number(newPrice))) {
      return res.status(400).json({ error: 'Valid newPrice query parameter is required' });
    }

    const impact = await CostCalculationService.calculatePriceImpactPreview(id, newPrice);
    res.json(impact);
  } catch (error) {
    next(error);
  }
};

// PUT /api/raw-materials/:id/price
const updatePrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPrice, reason } = req.body;

    if (newPrice === undefined || isNaN(Number(newPrice))) {
      return res.status(400).json({ error: 'Valid newPrice is required' });
    }

    const price = toDecimal(newPrice);
    if (price.isNegative()) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const result = await CostCalculationService.propagateRawMaterialPrice(
      id,
      price,
      req.user?.id,
      reason
    );

    res.json({
      message: 'Raw material price updated and costs propagated successfully',
      result
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/raw-materials/:id (archive/soft-delete if used)
const deleteRawMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const materialId = Number(id);

    const existing = await prisma.rawMaterial.findUnique({
      where: { id: materialId },
      include: {
        _count: {
          select: { componentMaterials: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    // If material is used in components, do not hard-delete; archive it.
    if (existing._count.componentMaterials > 0) {
      const archived = await prisma.rawMaterial.update({
        where: { id: materialId },
        data: {
          isArchived: true,
          status: 'archived',
          archivedAt: new Date()
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'ARCHIVE',
          entity: 'RawMaterial',
          entityId: materialId,
          details: `Archived raw material ${existing.name} (currently used in ${existing._count.componentMaterials} components)`
        }
      });

      return res.json({
        message: 'Raw material is used in active components and has been archived instead of deleted.',
        archived: true,
        material: archived
      });
    }

    // Otherwise safe hard delete
    await prisma.rawMaterialPriceHistory.deleteMany({ where: { rawMaterialId: materialId } });
    await prisma.rawMaterial.delete({ where: { id: materialId } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'RawMaterial',
        entityId: materialId,
        details: `Deleted unused raw material ${existing.name}`
      }
    });

    res.json({ message: 'Raw material deleted successfully', deleted: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/raw-materials/:id/history
const getPriceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await prisma.rawMaterialPriceHistory.findMany({
      where: { rawMaterialId: Number(id) },
      orderBy: { changedAt: 'asc' }
    });

    const formatted = history.map(h => ({
      id: h.id,
      date: h.changedAt.toISOString().split('T')[0],
      changedAt: h.changedAt,
      previousPrice: toDecimal(h.previousPrice).toNumber(),
      newPrice: toDecimal(h.newPrice).toNumber(),
      difference: toDecimal(h.difference).toNumber(),
      changePct: toDecimal(h.changePct).toNumber()
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/raw-materials/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.rawMaterial.findMany({
      select: { category: true },
      distinct: ['category']
    });
    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  previewPriceImpact,
  updatePrice,
  deleteRawMaterial,
  getPriceHistory,
  getCategories
};
