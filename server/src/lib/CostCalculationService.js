const { Decimal } = require('decimal.js');
const prisma = require('./prisma');
const {
  toDecimal,
  add,
  subtract,
  multiply,
  divide,
  calculatePercentageChange
} = require('../utils/decimalUtils');
const { calculateMaterialCost, convertToBaseUnit } = require('../utils/unitConversion');

class CostCalculationService {
  /**
   * Calculate the cost of a raw material used in a component
   * @param {Decimal|number|string} quantity - Quantity used
   * @param {string} usageUnit - Unit of quantity (e.g. gram, ml, kg, piece)
   * @param {Decimal|number|string} pricePerBaseUnit - Rate of material per base unit
   * @param {string} materialBaseUnit - Base unit of the material (e.g. kg, litre, piece)
   */
  static calculateRawMaterialCost(quantity, usageUnit, pricePerBaseUnit, materialBaseUnit = 'kg') {
    return calculateMaterialCost(quantity, usageUnit, pricePerBaseUnit, materialBaseUnit);
  }

  /**
   * Calculate total cost of a component from its materials and additional cost
   * @param {Array} materials - Array of { quantity, unit, rawMaterial: { currentPrice, unit } }
   * @param {Decimal|number|string} additionalCost - Additional processing cost for component
   */
  static calculateComponentCost(materials = [], additionalCost = 0) {
    let totalMaterialCost = new Decimal(0);
    const materialBreakdown = [];

    for (const item of materials) {
      const rate = item.rawMaterial ? item.rawMaterial.currentPrice : (item.price || 0);
      const baseUnit = item.rawMaterial ? item.rawMaterial.unit : (item.materialUnit || item.unit);
      const cost = this.calculateRawMaterialCost(item.quantity, item.unit, rate, baseUnit);
      
      totalMaterialCost = totalMaterialCost.plus(cost);
      materialBreakdown.push({
        rawMaterialId: item.rawMaterialId,
        rawMaterialName: item.rawMaterial?.name || item.name,
        quantity: toDecimal(item.quantity).toNumber(),
        unit: item.unit,
        rate: toDecimal(rate).toNumber(),
        baseUnit,
        cost: cost.toNumber()
      });
    }

    const totalCost = totalMaterialCost.plus(toDecimal(additionalCost));

    return {
      materialCost: totalMaterialCost.toDecimalPlaces(4),
      additionalCost: toDecimal(additionalCost).toDecimalPlaces(4),
      totalCost: totalCost.toDecimalPlaces(4),
      materials: materialBreakdown
    };
  }

  /**
   * Calculate material cost of a product from its components
   * @param {Array} productComponents - Array of { quantity, component: { currentCost } }
   */
  static calculateProductMaterialCost(productComponents = []) {
    let totalMaterialCost = new Decimal(0);
    const componentBreakdown = [];

    for (const pc of productComponents) {
      const qty = toDecimal(pc.quantity || 1);
      const unitCost = toDecimal(pc.component?.currentCost || pc.cost || 0);
      const cost = qty.times(unitCost);

      totalMaterialCost = totalMaterialCost.plus(cost);
      componentBreakdown.push({
        componentId: pc.componentId,
        componentName: pc.component?.name || pc.name,
        quantity: qty.toNumber(),
        unitCost: unitCost.toNumber(),
        cost: cost.toDecimalPlaces(4).toNumber()
      });
    }

    return {
      materialCost: totalMaterialCost.toDecimalPlaces(4),
      components: componentBreakdown
    };
  }

  /**
   * Calculate packaging cost per product from packaging hierarchy configs
   * Supports multi-level packaging (e.g. 1 Outer Carton = ₹120, 8 Inner Boxes = ₹10 each, Tape = ₹15, holds 240 products total)
   * Formula: Total Packaging Batch Cost / Total Products in Packaging Batch
   * @param {Array} packagingConfigs 
   */
  static calculatePackagingCostPerProduct(packagingConfigs = []) {
    if (!packagingConfigs || packagingConfigs.length === 0) {
      return new Decimal(0);
    }

    let totalPackagingCost = new Decimal(0);

    for (const pkg of packagingConfigs) {
      const unitCost = toDecimal(pkg.unitCost || 0);
      const unitsPerParent = toDecimal(pkg.unitsPerParent || 1);
      const productsPerUnit = toDecimal(pkg.productsPerUnit || 1);

      // If productsPerUnit is provided directly, cost per product is unitCost / productsPerUnit
      if (productsPerUnit.greaterThan(0)) {
        const perProductCost = unitCost.times(unitsPerParent).dividedBy(productsPerUnit);
        totalPackagingCost = totalPackagingCost.plus(perProductCost);
      } else {
        totalPackagingCost = totalPackagingCost.plus(unitCost);
      }
    }

    return totalPackagingCost.toDecimalPlaces(4);
  }

  /**
   * Calculate total manufacturing cost of a product
   */
  static calculateManufacturingCost({
    materialCost = 0,
    labourCost = 0,
    machineCost = 0,
    manufacturingOverhead = 0,
    otherCost = 0,
    packagingCost = 0,
    transportationCost = 0,
    wastagePct = 0
  }) {
    const mat = toDecimal(materialCost);
    const lab = toDecimal(labourCost);
    const mac = toDecimal(machineCost);
    const ovh = toDecimal(manufacturingOverhead);
    const oth = toDecimal(otherCost);
    const pkg = toDecimal(packagingCost);
    const tra = toDecimal(transportationCost);
    const wstPct = toDecimal(wastagePct);

    // Wastage is calculated on material cost (or base cost)
    const wastageCost = mat.times(wstPct).dividedBy(100);

    const totalManufacturingCost = mat
      .plus(lab)
      .plus(mac)
      .plus(ovh)
      .plus(oth)
      .plus(pkg)
      .plus(wastageCost)
      .plus(tra);

    return {
      materialCost: mat.toDecimalPlaces(4),
      labourCost: lab.toDecimalPlaces(4),
      machineCost: mac.toDecimalPlaces(4),
      manufacturingOverhead: ovh.toDecimalPlaces(4),
      otherCost: oth.toDecimalPlaces(4),
      packagingCost: pkg.toDecimalPlaces(4),
      transportationCost: tra.toDecimalPlaces(4),
      wastagePct: wstPct.toDecimalPlaces(2),
      wastageCost: wastageCost.toDecimalPlaces(4),
      totalManufacturingCost: totalManufacturingCost.toDecimalPlaces(4)
    };
  }

  /**
   * Calculate selling price, profit, markup % and profit margin %
   * Markup: Selling Price = Cost * (1 + Markup% / 100)
   * Profit Margin: Selling Price = Cost / (1 - Margin% / 100)
   * Given: User entered selling price -> calculate profit, markup %, margin %
   */
  static calculatePricing({
    cost = 0,
    profitType = 'markup', // 'markup', 'margin', 'given'
    profitPercentage = 0,
    givenSellingPrice = null
  }) {
    const c = toDecimal(cost);
    const pct = toDecimal(profitPercentage);
    let sellingPrice = new Decimal(0);
    let profit = new Decimal(0);
    let markupPct = new Decimal(0);
    let marginPct = new Decimal(0);

    if (c.isZero()) {
      if (givenSellingPrice && toDecimal(givenSellingPrice).greaterThan(0)) {
        sellingPrice = toDecimal(givenSellingPrice);
        profit = sellingPrice;
        marginPct = new Decimal(100);
      }
      return {
        cost: new Decimal(0),
        profitType,
        profitPercentage: pct.toNumber(),
        sellingPrice: sellingPrice.toDecimalPlaces(2),
        profit: profit.toDecimalPlaces(2),
        markupPercentage: markupPct.toDecimalPlaces(2).toNumber(),
        profitMarginPercentage: marginPct.toDecimalPlaces(2).toNumber(),
        breakEvenPrice: new Decimal(0)
      };
    }

    if (profitType === 'markup') {
      // Selling Price = Cost * (1 + Markup% / 100)
      const factor = new Decimal(1).plus(pct.dividedBy(100));
      sellingPrice = c.times(factor);
      profit = sellingPrice.minus(c);
      markupPct = pct;
      marginPct = sellingPrice.greaterThan(0) ? profit.dividedBy(sellingPrice).times(100) : new Decimal(0);
    } else if (profitType === 'margin') {
      // Selling Price = Cost / (1 - Margin% / 100)
      if (pct.greaterThanOrEqualTo(100)) {
        throw new Error('Profit margin cannot be 100% or greater');
      }
      const factor = new Decimal(1).minus(pct.dividedBy(100));
      sellingPrice = c.dividedBy(factor);
      profit = sellingPrice.minus(c);
      marginPct = pct;
      markupPct = c.greaterThan(0) ? profit.dividedBy(c).times(100) : new Decimal(0);
    } else if (profitType === 'given' || (givenSellingPrice !== null && givenSellingPrice !== undefined)) {
      sellingPrice = toDecimal(givenSellingPrice || 0);
      profit = sellingPrice.minus(c);
      markupPct = c.greaterThan(0) ? profit.dividedBy(c).times(100) : new Decimal(0);
      marginPct = sellingPrice.greaterThan(0) ? profit.dividedBy(sellingPrice).times(100) : new Decimal(0);
    }

    return {
      cost: c.toDecimalPlaces(4),
      profitType,
      profitPercentage: pct.toNumber(),
      sellingPrice: sellingPrice.toDecimalPlaces(2),
      profit: profit.toDecimalPlaces(2),
      markupPercentage: markupPct.toDecimalPlaces(2).toNumber(),
      profitMarginPercentage: marginPct.toDecimalPlaces(2).toNumber(),
      breakEvenPrice: c.toDecimalPlaces(2)
    };
  }

  /**
   * Find affected components when a raw material price changes
   */
  static async findAffectedComponents(rawMaterialId) {
    return prisma.component.findMany({
      where: {
        isArchived: false,
        materials: {
          some: {
            rawMaterialId: Number(rawMaterialId)
          }
        }
      },
      include: {
        materials: {
          include: {
            rawMaterial: true
          }
        }
      }
    });
  }

  /**
   * Find affected products from a list of component IDs
   */
  static async findAffectedProducts(componentIds = []) {
    if (componentIds.length === 0) return [];
    return prisma.product.findMany({
      where: {
        isArchived: false,
        components: {
          some: {
            componentId: { in: componentIds.map(Number) }
          }
        }
      },
      include: {
        components: {
          include: {
            component: {
              include: {
                materials: {
                  include: {
                    rawMaterial: true
                  }
                }
              }
            }
          }
        },
        packagingConfig: true,
        clientPrices: {
          include: {
            client: true
          }
        }
      }
    });
  }

  /**
   * Calculate price impact preview without modifying database
   */
  static async calculatePriceImpactPreview(rawMaterialId, newPrice) {
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: Number(rawMaterialId) }
    });

    if (!rawMaterial) {
      throw new Error(`Raw material with ID ${rawMaterialId} not found`);
    }

    const oldPrice = toDecimal(rawMaterial.currentPrice);
    const targetNewPrice = toDecimal(newPrice);
    const priceDiff = targetNewPrice.minus(oldPrice);
    const priceDiffPct = calculatePercentageChange(oldPrice, targetNewPrice);

    const affectedComponents = await this.findAffectedComponents(rawMaterialId);
    const componentImpacts = [];
    const componentMap = new Map();

    for (const comp of affectedComponents) {
      const oldCost = toDecimal(comp.currentCost);
      // Simulate new component cost
      let simulatedMatCost = new Decimal(0);
      for (const cm of comp.materials) {
        const rate = cm.rawMaterialId === Number(rawMaterialId)
          ? targetNewPrice
          : toDecimal(cm.rawMaterial.currentPrice);
        const cost = this.calculateRawMaterialCost(cm.quantity, cm.unit, rate, cm.rawMaterial.unit);
        simulatedMatCost = simulatedMatCost.plus(cost);
      }
      const newCost = simulatedMatCost.plus(toDecimal(comp.additionalCost));
      const diff = newCost.minus(oldCost);
      const diffPct = calculatePercentageChange(oldCost, newCost);

      const impact = {
        id: comp.id,
        name: comp.name,
        oldCost: oldCost.toDecimalPlaces(2).toNumber(),
        newCost: newCost.toDecimalPlaces(2).toNumber(),
        difference: diff.toDecimalPlaces(2).toNumber(),
        differencePct: diffPct.toDecimalPlaces(2).toNumber()
      };
      componentImpacts.push(impact);
      componentMap.set(comp.id, newCost);
    }

    const componentIds = affectedComponents.map(c => c.id);
    const affectedProducts = await this.findAffectedProducts(componentIds);
    const productImpacts = [];

    for (const prod of affectedProducts) {
      const oldCost = toDecimal(prod.manufacturingCost);
      const oldRecommendedPrice = toDecimal(prod.recommendedSellingPrice);
      const currentSellingPrice = prod.givenSellingPrice
        ? toDecimal(prod.givenSellingPrice)
        : oldRecommendedPrice;

      // Recalculate material cost with simulated component costs
      let simulatedProductMatCost = new Decimal(0);
      for (const pc of prod.components) {
        const compCost = componentMap.has(pc.componentId)
          ? componentMap.get(pc.componentId)
          : toDecimal(pc.component.currentCost);
        const lineCost = toDecimal(pc.quantity).times(compCost);
        simulatedProductMatCost = simulatedProductMatCost.plus(lineCost);
      }

      const packagingCost = prod.packagingConfig?.length > 0
        ? this.calculatePackagingCostPerProduct(prod.packagingConfig)
        : toDecimal(prod.packagingCost);

      const mfgCostResult = this.calculateManufacturingCost({
        materialCost: simulatedProductMatCost,
        labourCost: prod.labourCost,
        machineCost: prod.machineCost,
        manufacturingOverhead: prod.manufacturingOverhead,
        otherCost: prod.otherCost,
        packagingCost: packagingCost,
        transportationCost: prod.transportationCost,
        wastagePct: prod.wastagePct
      });

      const newManufacturingCost = mfgCostResult.totalManufacturingCost;
      const costDiff = newManufacturingCost.minus(oldCost);
      const costDiffPct = calculatePercentageChange(oldCost, newManufacturingCost);

      // Calculate new recommended price maintaining same profit type/percentage
      const pricingResult = this.calculatePricing({
        cost: newManufacturingCost,
        profitType: prod.profitType,
        profitPercentage: prod.profitPercentage,
        givenSellingPrice: prod.givenSellingPrice
      });

      const newRecommendedPrice = pricingResult.sellingPrice;
      const currentProfit = currentSellingPrice.minus(newManufacturingCost);
      const recommendedProfit = newRecommendedPrice.minus(newManufacturingCost);
      const profitDiff = currentProfit.minus(currentSellingPrice.minus(oldCost));

      productImpacts.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        oldCost: oldCost.toDecimalPlaces(2).toNumber(),
        newCost: newManufacturingCost.toDecimalPlaces(2).toNumber(),
        costDifference: costDiff.toDecimalPlaces(2).toNumber(),
        costDifferencePct: costDiffPct.toDecimalPlaces(2).toNumber(),
        currentSellingPrice: currentSellingPrice.toDecimalPlaces(2).toNumber(),
        oldRecommendedPrice: oldRecommendedPrice.toDecimalPlaces(2).toNumber(),
        newRecommendedSellingPrice: newRecommendedPrice.toDecimalPlaces(2).toNumber(),
        currentProfit: currentProfit.toDecimalPlaces(2).toNumber(),
        recommendedProfit: recommendedProfit.toDecimalPlaces(2).toNumber(),
        profitDifference: profitDiff.toDecimalPlaces(2).toNumber()
      });
    }

    return {
      rawMaterial: {
        id: rawMaterial.id,
        name: rawMaterial.name,
        category: rawMaterial.category,
        unit: rawMaterial.unit,
        oldPrice: oldPrice.toDecimalPlaces(2).toNumber(),
        newPrice: targetNewPrice.toDecimalPlaces(2).toNumber(),
        difference: priceDiff.toDecimalPlaces(2).toNumber(),
        differencePct: priceDiffPct.toDecimalPlaces(2).toNumber()
      },
      affectedComponentsCount: componentImpacts.length,
      affectedProductsCount: productImpacts.length,
      componentImpacts,
      productImpacts
    };
  }

  /**
   * Execute full automated price propagation and update database atomically
   */
  static async propagateRawMaterialPrice(rawMaterialId, newPrice, userId = null, customReason = null) {
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: Number(rawMaterialId) }
    });

    if (!rawMaterial) {
      throw new Error(`Raw material #${rawMaterialId} not found`);
    }

    const oldPrice = toDecimal(rawMaterial.currentPrice);
    const targetNewPrice = toDecimal(newPrice);
    const diff = targetNewPrice.minus(oldPrice);
    const diffPct = calculatePercentageChange(oldPrice, targetNewPrice);
    const now = new Date();

    const reason = customReason || `Raw material '${rawMaterial.name}' price changed from ₹${oldPrice.toFixed(2)}/${rawMaterial.unit} to ₹${targetNewPrice.toFixed(2)}/${rawMaterial.unit}`;

    // 1. Update Raw Material and create price history
    await prisma.$transaction(async (tx) => {
      await tx.rawMaterial.update({
        where: { id: rawMaterial.id },
        data: {
          previousPrice: oldPrice,
          currentPrice: targetNewPrice,
          priceChange: diff,
          priceChangePct: diffPct,
          updatedAt: now
        }
      });

      await tx.rawMaterialPriceHistory.create({
        data: {
          rawMaterialId: rawMaterial.id,
          previousPrice: oldPrice,
          newPrice: targetNewPrice,
          difference: diff,
          changePct: diffPct,
          changedAt: now
        }
      });
    });

    // 2. Find and recalculate affected components
    const affectedComponents = await this.findAffectedComponents(rawMaterialId);
    const updatedComponents = [];

    for (const comp of affectedComponents) {
      const oldCompCost = toDecimal(comp.currentCost);

      // Recalculate component materials
      let newCompMatCost = new Decimal(0);
      for (const cm of comp.materials) {
        const rate = cm.rawMaterialId === Number(rawMaterialId)
          ? targetNewPrice
          : toDecimal(cm.rawMaterial.currentPrice);
        const lineCost = this.calculateRawMaterialCost(cm.quantity, cm.unit, rate, cm.rawMaterial.unit);
        
        await prisma.componentMaterial.update({
          where: { id: cm.id },
          data: { cost: lineCost }
        });

        newCompMatCost = newCompMatCost.plus(lineCost);
      }

      const newTotalCompCost = newCompMatCost.plus(toDecimal(comp.additionalCost));

      await prisma.component.update({
        where: { id: comp.id },
        data: {
          previousCost: oldCompCost,
          currentCost: newTotalCompCost,
          updatedAt: now
        }
      });

      updatedComponents.push({
        id: comp.id,
        name: comp.name,
        oldCost: oldCompCost.toDecimalPlaces(2).toNumber(),
        newCost: newTotalCompCost.toDecimalPlaces(2).toNumber()
      });
    }

    // 3. Find and recalculate affected products
    const componentIds = affectedComponents.map(c => c.id);
    const affectedProducts = await this.findAffectedProducts(componentIds);
    const updatedProducts = [];

    for (const prod of affectedProducts) {
      const oldMfgCost = toDecimal(prod.manufacturingCost);
      const oldRecPrice = toDecimal(prod.recommendedSellingPrice);

      // Recalculate product components cost
      let newProdMatCost = new Decimal(0);
      for (const pc of prod.components) {
        // Fetch freshly updated component cost
        const freshComp = await prisma.component.findUnique({ where: { id: pc.componentId } });
        const compCost = toDecimal(freshComp.currentCost);
        const lineCost = toDecimal(pc.quantity).times(compCost);

        await prisma.productComponent.update({
          where: { id: pc.id },
          data: { cost: lineCost }
        });

        newProdMatCost = newProdMatCost.plus(lineCost);
      }

      const packagingCost = prod.packagingConfig?.length > 0
        ? this.calculatePackagingCostPerProduct(prod.packagingConfig)
        : toDecimal(prod.packagingCost);

      const mfgResult = this.calculateManufacturingCost({
        materialCost: newProdMatCost,
        labourCost: prod.labourCost,
        machineCost: prod.machineCost,
        manufacturingOverhead: prod.manufacturingOverhead,
        otherCost: prod.otherCost,
        packagingCost: packagingCost,
        transportationCost: prod.transportationCost,
        wastagePct: prod.wastagePct
      });

      const newMfgCost = mfgResult.totalManufacturingCost;
      const costDiff = newMfgCost.minus(oldMfgCost);
      const costDiffPct = calculatePercentageChange(oldMfgCost, newMfgCost);

      // Recalculate recommended selling price (preserve profit percentage & type)
      const pricingResult = this.calculatePricing({
        cost: newMfgCost,
        profitType: prod.profitType,
        profitPercentage: prod.profitPercentage,
        givenSellingPrice: prod.givenSellingPrice
      });

      const newRecPrice = pricingResult.sellingPrice;

      // Update product record
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          materialCost: mfgResult.materialCost,
          wastageCost: mfgResult.wastageCost,
          packagingCost: mfgResult.packagingCost,
          manufacturingCost: newMfgCost,
          previousManufacturingCost: oldMfgCost,
          recommendedSellingPrice: newRecPrice,
          lastRecalculatedAt: now,
          updatedAt: now
        }
      });

      // Record in CostChangeHistory
      await prisma.costChangeHistory.create({
        data: {
          productId: prod.id,
          previousCost: oldMfgCost,
          newCost: newMfgCost,
          difference: costDiff,
          differencePct: costDiffPct,
          previousRecommendedPrice: oldRecPrice,
          newRecommendedPrice: newRecPrice,
          reason,
          triggerMaterialId: Number(rawMaterialId),
          changedAt: now
        }
      });

      // Update client product price profit margins (without altering client agreed selling prices)
      const clientPrices = await prisma.clientProductPrice.findMany({
        where: { productId: prod.id }
      });

      for (const cp of clientPrices) {
        const clientSellingPrice = toDecimal(cp.sellingPrice);
        const newClientProfit = clientSellingPrice.minus(newMfgCost);
        const newClientMarkup = newMfgCost.greaterThan(0) ? newClientProfit.dividedBy(newMfgCost).times(100) : new Decimal(0);
        const newClientMargin = clientSellingPrice.greaterThan(0) ? newClientProfit.dividedBy(clientSellingPrice).times(100) : new Decimal(0);

        await prisma.clientProductPrice.update({
          where: { id: cp.id },
          data: {
            profit: newClientProfit,
            markup: newClientMarkup,
            profitMargin: newClientMargin,
            updatedAt: now
          }
        });
      }

      updatedProducts.push({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        oldCost: oldMfgCost.toDecimalPlaces(2).toNumber(),
        newCost: newMfgCost.toDecimalPlaces(2).toNumber(),
        costDifference: costDiff.toDecimalPlaces(2).toNumber(),
        costDifferencePct: costDiffPct.toDecimalPlaces(2).toNumber(),
        oldRecommendedSellingPrice: oldRecPrice.toDecimalPlaces(2).toNumber(),
        newRecommendedSellingPrice: newRecPrice.toDecimalPlaces(2).toNumber()
      });
    }

    // 4. Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PRICE_PROPAGATION',
        entity: 'RawMaterial',
        entityId: Number(rawMaterialId),
        oldValue: JSON.stringify({ price: oldPrice.toNumber() }),
        newValue: JSON.stringify({ price: targetNewPrice.toNumber() }),
        details: `${reason}. Affected ${updatedComponents.length} components, ${updatedProducts.length} products.`
      }
    });

    return {
      rawMaterial: {
        id: rawMaterial.id,
        name: rawMaterial.name,
        unit: rawMaterial.unit,
        oldPrice: oldPrice.toDecimalPlaces(2).toNumber(),
        newPrice: targetNewPrice.toDecimalPlaces(2).toNumber(),
        difference: diff.toDecimalPlaces(2).toNumber(),
        differencePct: diffPct.toDecimalPlaces(2).toNumber()
      },
      affectedComponents: updatedComponents,
      affectedProducts: updatedProducts
    };
  }
}

module.exports = CostCalculationService;
