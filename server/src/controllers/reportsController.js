const prisma = require('../lib/prisma');
const { toDecimal } = require('../utils/decimalUtils');

// Convert array of objects to CSV string
const jsonToCsv = (items, fields) => {
  const header = fields.map(f => `"${f.label}"`).join(',');
  const rows = items.map(item => {
    return fields.map(f => {
      let val = item[f.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'number') val = val.toFixed(2);
      return `"${val.toString().replace(/"/g, '""')}"`;
    }).join(',');
  });
  return [header, ...rows].join('\r\n');
};

// GET /api/reports/product-cost
const getProductCostReport = async (req, res, next) => {
  try {
    const { format } = req.query;

    const products = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' }
    });

    const reportData = products.map(p => {
      const currentCost = toDecimal(p.manufacturingCost).toNumber();
      const recPrice = toDecimal(p.recommendedSellingPrice).toNumber();
      const sellPrice = p.givenSellingPrice ? toDecimal(p.givenSellingPrice).toNumber() : recPrice;
      const profit = sellPrice - currentCost;
      const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
      const markup = currentCost > 0 ? (profit / currentCost) * 100 : 0;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category || 'General',
        materialCost: toDecimal(p.materialCost).toNumber(),
        labourCost: toDecimal(p.labourCost).toNumber(),
        machineCost: toDecimal(p.machineCost).toNumber(),
        manufacturingOverhead: toDecimal(p.manufacturingOverhead).toNumber(),
        packagingCost: toDecimal(p.packagingCost).toNumber(),
        transportationCost: toDecimal(p.transportationCost).toNumber(),
        otherCost: toDecimal(p.otherCost).toNumber(),
        wastageCost: toDecimal(p.wastageCost).toNumber(),
        totalManufacturingCost: currentCost,
        profitType: p.profitType,
        profitPercentage: toDecimal(p.profitPercentage).toNumber(),
        sellingPrice: sellPrice,
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        markup: Number(markup.toFixed(2))
      };
    });

    if (format === 'csv') {
      const fields = [
        { label: 'Product SKU', key: 'sku' },
        { label: 'Product Name', key: 'name' },
        { label: 'Category', key: 'category' },
        { label: 'Material Cost (₹)', key: 'materialCost' },
        { label: 'Labour Cost (₹)', key: 'labourCost' },
        { label: 'Machine Cost (₹)', key: 'machineCost' },
        { label: 'Overhead Cost (₹)', key: 'manufacturingOverhead' },
        { label: 'Packaging Cost (₹)', key: 'packagingCost' },
        { label: 'Transport Cost (₹)', key: 'transportationCost' },
        { label: 'Other Cost (₹)', key: 'otherCost' },
        { label: 'Wastage Cost (₹)', key: 'wastageCost' },
        { label: 'Total Mfg Cost (₹)', key: 'totalManufacturingCost' },
        { label: 'Selling Price (₹)', key: 'sellingPrice' },
        { label: 'Unit Profit (₹)', key: 'profit' },
        { label: 'Profit Margin (%)', key: 'profitMargin' }
      ];

      const csv = jsonToCsv(reportData, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment(`Product_Costing_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    }

    res.json(reportData);
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/material-impact
const getMaterialImpactReport = async (req, res, next) => {
  try {
    const { format } = req.query;

    const materials = await prisma.rawMaterial.findMany({
      where: { isArchived: false },
      include: {
        componentMaterials: {
          include: {
            component: {
              include: {
                productComponents: {
                  include: { product: true }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const reportData = materials.map(m => {
      const currentPrice = toDecimal(m.currentPrice).toNumber();
      const prevPrice = m.previousPrice ? toDecimal(m.previousPrice).toNumber() : currentPrice;
      const priceDiff = currentPrice - prevPrice;
      const priceDiffPct = prevPrice > 0 ? (priceDiff / prevPrice) * 100 : 0;

      const compSet = new Set();
      const prodSet = new Set();

      for (const cm of m.componentMaterials) {
        if (!cm.component.isArchived) {
          compSet.add(cm.component.name);
          for (const pc of cm.component.productComponents) {
            if (!pc.product.isArchived) {
              prodSet.add(pc.product.name);
            }
          }
        }
      }

      return {
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        previousPrice: prevPrice,
        currentPrice: currentPrice,
        priceDifference: Number(priceDiff.toFixed(2)),
        priceDifferencePct: Number(priceDiffPct.toFixed(2)),
        affectedComponentsCount: compSet.size,
        affectedProductsCount: prodSet.size,
        affectedComponentsList: Array.from(compSet).join(', '),
        affectedProductsList: Array.from(prodSet).join(', ')
      };
    });

    if (format === 'csv') {
      const fields = [
        { label: 'Material Name', key: 'name' },
        { label: 'Category', key: 'category' },
        { label: 'Unit', key: 'unit' },
        { label: 'Old Rate (₹)', key: 'previousPrice' },
        { label: 'Current Rate (₹)', key: 'currentPrice' },
        { label: 'Difference (₹)', key: 'priceDifference' },
        { label: 'Difference (%)', key: 'priceDifferencePct' },
        { label: 'Affected Components', key: 'affectedComponentsCount' },
        { label: 'Affected Products', key: 'affectedProductsCount' },
        { label: 'Products Impacted', key: 'affectedProductsList' }
      ];

      const csv = jsonToCsv(reportData, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment(`Material_Price_Impact_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    }

    res.json(reportData);
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/client-profit
const getClientProfitReport = async (req, res, next) => {
  try {
    const { format } = req.query;

    const clients = await prisma.client.findMany({
      where: { isArchived: false },
      include: {
        sales: {
          include: { product: true }
        },
        productPrices: {
          include: { product: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const reportData = clients.map(c => {
      let revenue = 0;
      let totalCost = 0;
      let profit = 0;
      let units = 0;

      for (const s of c.sales) {
        revenue += toDecimal(s.revenue).toNumber();
        totalCost += toDecimal(s.totalCost).toNumber();
        profit += toDecimal(s.profit).toNumber();
        units += toDecimal(s.quantity).toNumber();
      }

      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        contact: c.contact || '-',
        email: c.email || '-',
        unitsSold: units,
        totalRevenue: Number(revenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalProfit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        configuredProductsCount: c.productPrices.length
      };
    });

    if (format === 'csv') {
      const fields = [
        { label: 'Client Code', key: 'code' },
        { label: 'Client Name', key: 'name' },
        { label: 'Contact', key: 'contact' },
        { label: 'Total Units Sold', key: 'unitsSold' },
        { label: 'Total Revenue (₹)', key: 'totalRevenue' },
        { label: 'Total Cost (₹)', key: 'totalCost' },
        { label: 'Total Profit (₹)', key: 'totalProfit' },
        { label: 'Profit Margin (%)', key: 'profitMargin' }
      ];

      const csv = jsonToCsv(reportData, fields);
      res.header('Content-Type', 'text/csv');
      res.attachment(`Client_Profitability_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      return res.send(csv);
    }

    res.json(reportData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProductCostReport,
  getMaterialImpactReport,
  getClientProfitReport
};
