const { Decimal } = require('decimal.js');
const { toDecimal, multiply, divide } = require('./decimalUtils');

const UNIT_GROUPS = {
  // Mass (base: kg)
  kg: { base: 'kg', factor: 1 },
  kilogram: { base: 'kg', factor: 1 },
  g: { base: 'kg', factor: 0.001 },
  gram: { base: 'kg', factor: 0.001 },
  grams: { base: 'kg', factor: 0.001 },
  mg: { base: 'kg', factor: 0.000001 },
  milligram: { base: 'kg', factor: 0.000001 },
  tonne: { base: 'kg', factor: 1000 },
  ton: { base: 'kg', factor: 1000 },

  // Volume (base: litre)
  l: { base: 'litre', factor: 1 },
  litre: { base: 'litre', factor: 1 },
  liter: { base: 'litre', factor: 1 },
  litres: { base: 'litre', factor: 1 },
  ml: { base: 'litre', factor: 0.001 },
  millilitre: { base: 'litre', factor: 0.001 },

  // Length (base: meter)
  m: { base: 'meter', factor: 1 },
  meter: { base: 'meter', factor: 1 },
  meters: { base: 'meter', factor: 1 },
  cm: { base: 'meter', factor: 0.01 },
  centimeter: { base: 'meter', factor: 0.01 },
  mm: { base: 'meter', factor: 0.001 },
  millimeter: { base: 'meter', factor: 0.001 },

  // Count / Discrete (base: piece)
  piece: { base: 'piece', factor: 1 },
  pieces: { base: 'piece', factor: 1 },
  pc: { base: 'piece', factor: 1 },
  pcs: { base: 'piece', factor: 1 },
  unit: { base: 'piece', factor: 1 },
  units: { base: 'piece', factor: 1 },
  item: { base: 'piece', factor: 1 },
  pair: { base: 'piece', factor: 2 },
  dozen: { base: 'piece', factor: 12 }
};

const normalizeUnit = (unit) => {
  if (!unit) return 'piece';
  return unit.toString().trim().toLowerCase();
};

const convertQuantity = (quantity, fromUnit, toUnit) => {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return toDecimal(quantity);

  const fromInfo = UNIT_GROUPS[from];
  const toInfo = UNIT_GROUPS[to];

  if (!fromInfo || !toInfo) {
    // If unknown unit, assume 1:1 if matching or fallback
    return toDecimal(quantity);
  }

  if (fromInfo.base !== toInfo.base) {
    // Different physical dimensions - cannot directly convert without density
    return toDecimal(quantity);
  }

  // Convert fromUnit to base unit, then base unit to toUnit
  const quantityInBase = multiply(quantity, fromInfo.factor);
  return divide(quantityInBase, toInfo.factor);
};

const convertToBaseUnit = (quantity, unit) => {
  const norm = normalizeUnit(unit);
  const info = UNIT_GROUPS[norm];
  if (!info) return toDecimal(quantity);
  return multiply(quantity, info.factor);
};

/**
 * Calculate cost of a material usage given:
 * - quantity used
 * - usage unit (e.g. gram)
 * - price per material unit (e.g. ₹200)
 * - material unit (e.g. kg)
 * Example: 250 grams at ₹200/kg -> (250 / 1000) * 200 = ₹50
 */
const calculateMaterialCost = (quantity, usageUnit, pricePerMaterialUnit, materialUnit) => {
  const usageNorm = normalizeUnit(usageUnit);
  const matNorm = normalizeUnit(materialUnit);

  const usageInfo = UNIT_GROUPS[usageNorm];
  const matInfo = UNIT_GROUPS[matNorm];

  const qty = toDecimal(quantity);
  const rate = toDecimal(pricePerMaterialUnit);

  if (!usageInfo || !matInfo || usageInfo.base !== matInfo.base) {
    // Fallback direct multiplication if unit groups are unspecified or mismatched
    return qty.times(rate);
  }

  // Factor from usageUnit to materialUnit = usageInfo.factor / matInfo.factor
  const conversionFactor = divide(usageInfo.factor, matInfo.factor);
  const quantityInMaterialUnit = qty.times(conversionFactor);
  return quantityInMaterialUnit.times(rate);
};

module.exports = {
  UNIT_GROUPS,
  normalizeUnit,
  convertQuantity,
  convertToBaseUnit,
  calculateMaterialCost
};
