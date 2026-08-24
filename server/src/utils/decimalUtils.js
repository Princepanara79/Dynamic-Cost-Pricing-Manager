const Decimal = require('decimal.js');

const toDecimal = (value) => new Decimal(value || 0);

const add = (a, b) => toDecimal(a).plus(toDecimal(b));
const subtract = (a, b) => toDecimal(a).minus(toDecimal(b));
const multiply = (a, b) => toDecimal(a).times(toDecimal(b));
const divide = (a, b) => toDecimal(b).isZero() ? new Decimal(0) : toDecimal(a).dividedBy(toDecimal(b));

const round = (value, places = 4) => toDecimal(value).toDecimalPlaces(places).toNumber();

const formatCurrency = (value) => {
  return toDecimal(value).toFixed(2);
};

const calculatePercentage = (value, percentage) => {
  return divide(multiply(value, percentage), 100);
};

const calculatePercentageChange = (oldVal, newVal) => {
  const o = toDecimal(oldVal);
  const n = toDecimal(newVal);
  if (o.isZero()) return n.isZero() ? new Decimal(0) : new Decimal(100);
  return divide(subtract(n, o), o).times(100);
};

module.exports = {
  toDecimal,
  add,
  subtract,
  multiply,
  divide,
  round,
  formatCurrency,
  calculatePercentage,
  calculatePercentageChange
};
