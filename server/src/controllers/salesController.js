const prisma = require('../lib/prisma');
const { toDecimal } = require('../utils/decimalUtils');
const { getTenantContext } = require('../middleware/auth');

// GET /api/sales
const getSales = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { clientId, productId, startDate, endDate, search, sortBy = 'date', sortOrder = 'desc' } = req.query;

    const where = { manufacturerId };
    if (clientId) where.clientId = Number(clientId);
    if (productId) where.productId = Number(productId);

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { client: { name: { contains: search } } },
        { product: { name: { contains: search } } },
        { product: { sku: { contains: search } } },
        { notes: { contains: search } }
      ];
    }

    const sales = await prisma.sale.findMany({
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc' },
      include: {
        client: true,
        product: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const formatted = sales.map(s => ({
      id: s.id,
      date: s.date,
      clientId: s.clientId,
      clientName: s.client.name,
      clientCode: s.client.code,
      productId: s.productId,
      productName: s.product.name,
      sku: s.product.sku,
      category: s.product.category,
      quantity: toDecimal(s.quantity).toNumber(),
      sellingPrice: toDecimal(s.sellingPrice).toNumber(),
      costAtSale: toDecimal(s.costAtSale).toNumber(),
      revenue: toDecimal(s.revenue).toNumber(),
      totalCost: toDecimal(s.totalCost).toNumber(),
      profit: toDecimal(s.profit).toNumber(),
      profitMargin: toDecimal(s.profitMargin).toNumber(),
      notes: s.notes,
      recordedBy: s.user?.name || 'System'
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// POST /api/sales
const createSale = async (req, res, next) => {
  try {
    const { manufacturerId, userId } = getTenantContext(req);
    const { clientId, productId, quantity, sellingPrice, date, notes } = req.body;

    if (!clientId || !productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Client, Product, and valid quantity (> 0) are required' });
    }

    const product = await prisma.product.findFirst({ 
      where: { id: Number(productId), manufacturerId } 
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    const client = await prisma.client.findFirst({ 
      where: { id: Number(clientId), manufacturerId } 
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    // Determine selling price: user specified > client price override > recommended price
    let unitSellingPrice = sellingPrice !== undefined && sellingPrice !== null && !isNaN(Number(sellingPrice))
      ? toDecimal(sellingPrice)
      : null;

    if (!unitSellingPrice) {
      const clientPrice = await prisma.clientProductPrice.findUnique({
        where: {
          clientId_productId: {
            clientId: Number(clientId),
            productId: Number(productId)
          }
        }
      });

      if (clientPrice) {
        unitSellingPrice = toDecimal(clientPrice.sellingPrice);
      } else {
        unitSellingPrice = product.givenSellingPrice
          ? toDecimal(product.givenSellingPrice)
          : toDecimal(product.recommendedSellingPrice);
      }
    }

    const qty = toDecimal(quantity);
    // Locked current cost snapshot at time of sale
    const unitCostAtSale = toDecimal(product.manufacturingCost);
    const revenue = qty.times(unitSellingPrice);
    const totalCost = qty.times(unitCostAtSale);
    const profit = revenue.minus(totalCost);
    const profitMargin = revenue.greaterThan(0) ? profit.dividedBy(revenue).times(100) : toDecimal(0);

    const sale = await prisma.sale.create({
      data: {
        manufacturerId,
        date: date ? new Date(date) : new Date(),
        clientId: Number(clientId),
        productId: Number(productId),
        quantity: qty,
        sellingPrice: unitSellingPrice,
        costAtSale: unitCostAtSale,
        revenue,
        totalCost,
        profit,
        profitMargin,
        notes,
        userId
      },
      include: {
        client: true,
        product: true
      }
    });

    await prisma.auditLog.create({
      data: {
        manufacturerId,
        userId,
        action: 'RECORD_SALE',
        entity: 'Sale',
        entityId: sale.id,
        details: `Sold ${qty.toNumber()} units of ${product.name} to ${client.name} at ₹${unitSellingPrice.toFixed(2)}/unit (Cost locked: ₹${unitCostAtSale.toFixed(2)}/unit)`
      }
    });

    res.status(201).json({
      id: sale.id,
      date: sale.date,
      clientName: sale.client.name,
      productName: sale.product.name,
      quantity: qty.toNumber(),
      sellingPrice: unitSellingPrice.toNumber(),
      costAtSale: unitCostAtSale.toNumber(),
      revenue: revenue.toNumber(),
      totalCost: totalCost.toNumber(),
      profit: profit.toNumber(),
      profitMargin: Number(profitMargin.toFixed(2)),
      notes: sale.notes
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/sales/analytics
const getSalesAnalytics = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    
    const sales = await prisma.sale.findMany({
      where: { manufacturerId },
      include: { client: true, product: true },
      orderBy: { date: 'asc' }
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const monthlyMap = new Map();
    const productMap = new Map();
    const clientMap = new Map();

    for (const s of sales) {
      const rev = toDecimal(s.revenue).toNumber();
      const cost = toDecimal(s.totalCost).toNumber();
      const profit = toDecimal(s.profit).toNumber();
      const qty = toDecimal(s.quantity).toNumber();

      totalRevenue += rev;
      totalCost += cost;
      totalProfit += profit;

      // Group by Month (YYYY-MM)
      const monthKey = new Date(s.date).toISOString().slice(0, 7);
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, revenue: 0, cost: 0, profit: 0, units: 0 });
      }
      const m = monthlyMap.get(monthKey);
      m.revenue += rev;
      m.cost += cost;
      m.profit += profit;
      m.units += qty;

      // Group by Product
      if (!productMap.has(s.productId)) {
        productMap.set(s.productId, { name: s.product.name, sku: s.product.sku, revenue: 0, profit: 0, units: 0 });
      }
      const p = productMap.get(s.productId);
      p.revenue += rev;
      p.profit += profit;
      p.units += qty;

      // Group by Client
      if (!clientMap.has(s.clientId)) {
        clientMap.set(s.clientId, { name: s.client.name, code: s.client.code, revenue: 0, profit: 0, units: 0 });
      }
      const c = clientMap.get(s.clientId);
      c.revenue += rev;
      c.profit += profit;
      c.units += qty;
    }

    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        averageProfitMargin: Number(overallMargin.toFixed(2)),
        totalSalesCount: sales.length
      },
      monthlyTrends: Array.from(monthlyMap.values()).map(m => ({
        ...m,
        revenue: Number(m.revenue.toFixed(2)),
        cost: Number(m.cost.toFixed(2)),
        profit: Number(m.profit.toFixed(2))
      })),
      productBreakdown: Array.from(productMap.values()).map(p => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
        profit: Number(p.profit.toFixed(2))
      })),
      clientBreakdown: Array.from(clientMap.values()).map(c => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
        profit: Number(c.profit.toFixed(2))
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSales,
  createSale,
  getSalesAnalytics
};
