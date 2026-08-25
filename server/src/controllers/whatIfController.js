const prisma = require('../lib/prisma');
const CostCalculationService = require('../lib/CostCalculationService');
const { toDecimal, calculatePercentageChange } = require('../utils/decimalUtils');
const { getTenantContext } = require('../middleware/auth');

// POST /api/what-if/simulate
const simulateCost = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const {
      productId,
      rawMaterialPriceOverrides = {}, // { [rawMaterialId]: newPrice }
      componentQuantityOverrides = {}, // { [componentId]: newQty }
      labourCost,
      machineCost,
      manufacturingOverhead,
      otherCost,
      packagingCost,
      transportationCost,
      wastagePct,
      profitType,
      profitPercentage,
      givenSellingPrice
    } = req.body;

    const product = await prisma.product.findFirst({
      where: { id: Number(productId), manufacturerId },
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
        packagingConfig: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Baseline current values
    const currentCost = toDecimal(product.manufacturingCost).toNumber();
    const currentRecPrice = toDecimal(product.recommendedSellingPrice).toNumber();
    const currentSellingPrice = product.givenSellingPrice
      ? toDecimal(product.givenSellingPrice).toNumber()
      : currentRecPrice;
    const currentProfit = currentSellingPrice - currentCost;
    const currentMargin = currentSellingPrice > 0 ? (currentProfit / currentSellingPrice) * 100 : 0;

    // Simulate Component Costs with Raw Material Overrides
    let simulatedMaterialCost = toDecimal(0);
    const simulatedComponentsBreakdown = [];

    for (const pc of product.components) {
      const comp = pc.component;
      const simQty = componentQuantityOverrides[comp.id] !== undefined
        ? toDecimal(componentQuantityOverrides[comp.id])
        : toDecimal(pc.quantity);

      let simCompMatCost = toDecimal(0);
      for (const cm of comp.materials) {
        const rate = rawMaterialPriceOverrides[cm.rawMaterialId] !== undefined
          ? toDecimal(rawMaterialPriceOverrides[cm.rawMaterialId])
          : toDecimal(cm.rawMaterial.currentPrice);
        
        const lineCost = CostCalculationService.calculateRawMaterialCost(
          cm.quantity,
          cm.unit,
          rate,
          cm.rawMaterial.unit
        );
        simCompMatCost = simCompMatCost.plus(lineCost);
      }

      const simTotalCompCost = simCompMatCost.plus(toDecimal(comp.additionalCost));
      const simCompProductLineCost = simQty.times(simTotalCompCost);
      simulatedMaterialCost = simulatedMaterialCost.plus(simCompProductLineCost);

      simulatedComponentsBreakdown.push({
        componentId: comp.id,
        name: comp.name,
        baselineQuantity: toDecimal(pc.quantity).toNumber(),
        simulatedQuantity: simQty.toNumber(),
        baselineUnitCost: toDecimal(comp.currentCost).toNumber(),
        simulatedUnitCost: simTotalCompCost.toDecimalPlaces(2).toNumber(),
        simulatedTotalCost: simCompProductLineCost.toDecimalPlaces(2).toNumber()
      });
    }

    // Additional Costs
    const simLabour = labourCost !== undefined ? toDecimal(labourCost) : toDecimal(product.labourCost);
    const simMachine = machineCost !== undefined ? toDecimal(machineCost) : toDecimal(product.machineCost);
    const simOverhead = manufacturingOverhead !== undefined ? toDecimal(manufacturingOverhead) : toDecimal(product.manufacturingOverhead);
    const simOther = otherCost !== undefined ? toDecimal(otherCost) : toDecimal(product.otherCost);
    const simPackaging = packagingCost !== undefined
      ? toDecimal(packagingCost)
      : (product.packagingConfig?.length > 0
          ? CostCalculationService.calculatePackagingCostPerProduct(product.packagingConfig)
          : toDecimal(product.packagingCost));
    const simTransportation = transportationCost !== undefined ? toDecimal(transportationCost) : toDecimal(product.transportationCost);
    const simWastagePct = wastagePct !== undefined ? toDecimal(wastagePct) : toDecimal(product.wastagePct);

    const mfgResult = CostCalculationService.calculateManufacturingCost({
      materialCost: simulatedMaterialCost,
      labourCost: simLabour,
      machineCost: simMachine,
      manufacturingOverhead: simOverhead,
      otherCost: simOther,
      packagingCost: simPackaging,
      transportationCost: simTransportation,
      wastagePct: simWastagePct
    });

    const simProfitType = profitType || product.profitType;
    const simProfitPct = profitPercentage !== undefined ? profitPercentage : toDecimal(product.profitPercentage).toNumber();
    const simGivenPrice = givenSellingPrice !== undefined ? givenSellingPrice : product.givenSellingPrice;

    const pricingResult = CostCalculationService.calculatePricing({
      cost: mfgResult.totalManufacturingCost,
      profitType: simProfitType,
      profitPercentage: simProfitPct,
      givenSellingPrice: simGivenPrice
    });

    const simCost = mfgResult.totalManufacturingCost.toNumber();
    const simRecPrice = pricingResult.sellingPrice.toNumber();
    const simSellPrice = simGivenPrice ? toDecimal(simGivenPrice).toNumber() : simRecPrice;
    const simProfit = simSellPrice - simCost;
    const simMargin = simSellPrice > 0 ? (simProfit / simSellPrice) * 100 : 0;
    const costDiff = simCost - currentCost;
    const costDiffPct = currentCost > 0 ? ((costDiff / currentCost) * 100) : 0;

    res.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku
      },
      baseline: {
        materialCost: toDecimal(product.materialCost).toNumber(),
        labourCost: toDecimal(product.labourCost).toNumber(),
        machineCost: toDecimal(product.machineCost).toNumber(),
        manufacturingOverhead: toDecimal(product.manufacturingOverhead).toNumber(),
        otherCost: toDecimal(product.otherCost).toNumber(),
        packagingCost: toDecimal(product.packagingCost).toNumber(),
        transportationCost: toDecimal(product.transportationCost).toNumber(),
        wastageCost: toDecimal(product.wastageCost).toNumber(),
        manufacturingCost: currentCost,
        recommendedSellingPrice: currentRecPrice,
        sellingPrice: currentSellingPrice,
        profit: Number(currentProfit.toFixed(2)),
        profitMargin: Number(currentMargin.toFixed(2))
      },
      simulated: {
        materialCost: mfgResult.materialCost.toNumber(),
        labourCost: mfgResult.labourCost.toNumber(),
        machineCost: mfgResult.machineCost.toNumber(),
        manufacturingOverhead: mfgResult.manufacturingOverhead.toNumber(),
        otherCost: mfgResult.otherCost.toNumber(),
        packagingCost: mfgResult.packagingCost.toNumber(),
        transportationCost: mfgResult.transportationCost.toNumber(),
        wastageCost: mfgResult.wastageCost.toNumber(),
        manufacturingCost: simCost,
        recommendedSellingPrice: simRecPrice,
        sellingPrice: simSellPrice,
        profit: Number(simProfit.toFixed(2)),
        profitMargin: Number(simMargin.toFixed(2)),
        components: simulatedComponentsBreakdown
      },
      delta: {
        costDifference: Number(costDiff.toFixed(2)),
        costDifferencePct: Number(costDiffPct.toFixed(2)),
        profitDifference: Number((simProfit - currentProfit).toFixed(2)),
        marginDifference: Number((simMargin - currentMargin).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/what-if/scenarios
const getScenarios = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const scenarios = await prisma.whatIfScenario.findMany({
      where: { manufacturerId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(scenarios.map(s => ({
      ...s,
      parameters: JSON.parse(s.parameters || '{}'),
      results: JSON.parse(s.results || '{}')
    })));
  } catch (error) {
    next(error);
  }
};

// POST /api/what-if/scenarios
const saveScenario = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { name, description, parameters, results } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Scenario name is required' });
    }

    const scenario = await prisma.whatIfScenario.create({
      data: {
        manufacturerId,
        name,
        description,
        parameters: JSON.stringify(parameters || {}),
        results: JSON.stringify(results || {})
      }
    });

    res.status(201).json({
      ...scenario,
      parameters: JSON.parse(scenario.parameters),
      results: JSON.parse(scenario.results)
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/what-if/scenarios/:id
const deleteScenario = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    
    const existing = await prisma.whatIfScenario.findFirst({
      where: { id: Number(id), manufacturerId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Scenario not found or access denied' });
    }
    
    await prisma.whatIfScenario.delete({ where: { id: Number(id) } });
    res.json({ message: 'Scenario deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  simulateCost,
  getScenarios,
  saveScenario,
  deleteScenario
};
