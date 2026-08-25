const prisma = require('../lib/prisma');
const { toDecimal } = require('../utils/decimalUtils');
const { getTenantContext } = require('../middleware/auth');

// GET /api/clients
const getClients = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { search, status = 'active', sortBy = 'name', sortOrder = 'asc' } = req.query;

    const where = { manufacturerId };
    if (status === 'active') {
      where.isArchived = false;
    } else if (status === 'archived') {
      where.isArchived = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { contact: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' },
      include: {
        productPrices: {
          include: { product: true }
        },
        sales: true,
        _count: {
          select: { productPrices: true, sales: true }
        }
      }
    });

    const formatted = clients.map(c => {
      let totalRevenue = 0;
      let totalProfit = 0;

      for (const s of c.sales) {
        totalRevenue += toDecimal(s.revenue).toNumber();
        totalProfit += toDecimal(s.profit).toNumber();
      }

      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        contact: c.contact,
        email: c.email,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
        status: c.status,
        isArchived: c.isArchived,
        customPricesCount: c._count.productPrices,
        salesCount: c._count.sales,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        averageMargin: Number(avgMargin.toFixed(2)),
        updatedAt: c.updatedAt
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// GET /api/clients/:id
const getClientById = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const client = await prisma.client.findFirst({
      where: { id: Number(id), manufacturerId },
      include: {
        productPrices: {
          include: { product: true }
        },
        sales: {
          include: { product: true },
          orderBy: { date: 'desc' },
          take: 30
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    const customPrices = client.productPrices.map(cp => {
      const currentMfgCost = toDecimal(cp.product.manufacturingCost).toNumber();
      const sellingPrice = toDecimal(cp.sellingPrice).toNumber();
      const profit = sellingPrice - currentMfgCost;
      const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
      const markup = currentMfgCost > 0 ? (profit / currentMfgCost) * 100 : 0;

      return {
        id: cp.id,
        productId: cp.productId,
        productName: cp.product.name,
        sku: cp.product.sku,
        category: cp.product.category,
        manufacturingCost: currentMfgCost,
        recommendedPrice: toDecimal(cp.product.recommendedSellingPrice).toNumber(),
        sellingPrice,
        profit: Number(profit.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        markup: Number(markup.toFixed(2)),
        isActive: cp.isActive,
        updatedAt: cp.updatedAt
      };
    });

    const salesHistory = client.sales.map(s => ({
      id: s.id,
      date: s.date,
      productId: s.productId,
      productName: s.product.name,
      sku: s.product.sku,
      quantity: toDecimal(s.quantity).toNumber(),
      sellingPrice: toDecimal(s.sellingPrice).toNumber(),
      costAtSale: toDecimal(s.costAtSale).toNumber(),
      revenue: toDecimal(s.revenue).toNumber(),
      totalCost: toDecimal(s.totalCost).toNumber(),
      profit: toDecimal(s.profit).toNumber(),
      profitMargin: toDecimal(s.profitMargin).toNumber(),
      notes: s.notes
    }));

    res.json({
      id: client.id,
      name: client.name,
      code: client.code,
      contact: client.contact,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      status: client.status,
      isArchived: client.isArchived,
      customPrices,
      salesHistory
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/clients
const createClient = async (req, res, next) => {
  try {
    const { manufacturerId, userId } = getTenantContext(req);
    const { name, code, contact, email, phone, address, notes } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Client name and unique client code are required' });
    }

    const existing = await prisma.client.findUnique({ 
      where: { manufacturerId_code: { manufacturerId, code } } 
    });
    if (existing) {
      return res.status(400).json({ error: `Client code '${code}' is already registered in your account` });
    }

    const client = await prisma.client.create({
      data: {
        manufacturerId,
        name,
        code,
        contact,
        email,
        phone,
        address,
        notes
      }
    });

    await prisma.auditLog.create({
      data: {
        manufacturerId,
        userId,
        action: 'CREATE',
        entity: 'Client',
        entityId: client.id,
        details: `Created client '${name}' (${code})`
      }
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const { name, code, contact, email, phone, address, notes, status } = req.body;

    const existing = await prisma.client.findFirst({ 
      where: { id: Number(id), manufacturerId } 
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    if (code && code !== existing.code) {
      const codeCheck = await prisma.client.findUnique({ 
        where: { manufacturerId_code: { manufacturerId, code } } 
      });
      if (codeCheck) {
        return res.status(400).json({ error: `Client code '${code}' is already registered` });
      }
    }

    const updated = await prisma.client.update({
      where: { id: Number(id) },
      data: {
        name: name || existing.name,
        code: code || existing.code,
        contact: contact !== undefined ? contact : existing.contact,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        notes: notes !== undefined ? notes : existing.notes,
        status: status || existing.status,
        updatedAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    const { id } = req.params;
    const clientId = Number(id);

    const existing = await prisma.client.findFirst({
      where: { id: clientId, manufacturerId },
      include: {
        _count: { select: { sales: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Client not found or access denied' });
    }

    if (existing._count.sales > 0) {
      const archived = await prisma.client.update({
        where: { id: clientId },
        data: { isArchived: true, status: 'archived', archivedAt: new Date() }
      });
      return res.json({
        message: `Client has ${existing._count.sales} historical sales and has been archived.`,
        archived: true,
        client: archived
      });
    }

    await prisma.clientProductPrice.deleteMany({ where: { clientId } });
    await prisma.clientPriceHistory.deleteMany({ where: { clientId } });
    await prisma.client.delete({ where: { id: clientId } });

    res.json({ message: 'Client deleted successfully', deleted: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/clients/profit-analysis (Matrix across all clients & products)
const getAllClientsProfitAnalysis = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    
    const clients = await prisma.client.findMany({
      where: { isArchived: false, manufacturerId },
      include: {
        productPrices: {
          include: { product: true }
        },
        sales: {
          include: { product: true }
        }
      }
    });

    const analysis = [];
    const clientSummaries = [];

    for (const client of clients) {
      let totalClientRevenue = 0;
      let totalClientCost = 0;
      let totalClientProfit = 0;
      let totalQuantitySold = 0;

      for (const cp of client.productPrices) {
        if (cp.product.isArchived) continue;
        const currentCost = toDecimal(cp.product.manufacturingCost).toNumber();
        const sellingPrice = toDecimal(cp.sellingPrice).toNumber();
        const profit = sellingPrice - currentCost;
        const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
        const markup = currentCost > 0 ? (profit / currentCost) * 100 : 0;

        // Sales totals for this client & product
        const matchedSales = client.sales.filter(s => s.productId === cp.productId);
        const qtySold = matchedSales.reduce((acc, s) => acc + toDecimal(s.quantity).toNumber(), 0);
        const revenue = matchedSales.reduce((acc, s) => acc + toDecimal(s.revenue).toNumber(), 0);
        const cost = matchedSales.reduce((acc, s) => acc + toDecimal(s.totalCost).toNumber(), 0);
        const salesProfit = revenue - cost;

        totalClientRevenue += revenue;
        totalClientCost += cost;
        totalClientProfit += salesProfit;
        totalQuantitySold += qtySold;

        analysis.push({
          clientId: client.id,
          clientName: client.name,
          clientCode: client.code,
          productId: cp.productId,
          productName: cp.product.name,
          sku: cp.product.sku,
          category: cp.product.category,
          currentManufacturingCost: currentCost,
          sellingPrice,
          unitProfit: Number(profit.toFixed(2)),
          markupPercentage: Number(markup.toFixed(2)),
          profitMarginPercentage: Number(margin.toFixed(2)),
          totalQuantitySold: qtySold,
          totalRevenue: Number(revenue.toFixed(2)),
          totalHistoricalProfit: Number(salesProfit.toFixed(2))
        });
      }

      clientSummaries.push({
        clientId: client.id,
        clientName: client.name,
        clientCode: client.code,
        totalRevenue: Number(totalClientRevenue.toFixed(2)),
        totalCost: Number(totalClientCost.toFixed(2)),
        totalProfit: Number(totalClientProfit.toFixed(2)),
        averageMargin: totalClientRevenue > 0 ? Number(((totalClientProfit / totalClientRevenue) * 100).toFixed(2)) : 0,
        totalUnitsSold: totalQuantitySold
      });
    }

    res.json({
      details: analysis,
      clientSummaries
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getAllClientsProfitAnalysis
};
