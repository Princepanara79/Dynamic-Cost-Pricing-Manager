const prisma = require('../lib/prisma');
const { toDecimal } = require('../utils/decimalUtils');

// GET /api/client-prices
const getClientPrices = async (req, res, next) => {
  try {
    const { clientId, productId } = req.query;
    const manufacturerId = req.user.manufacturerId;

    const where = { manufacturerId };
    if (clientId) where.clientId = Number(clientId);
    if (productId) where.productId = Number(productId);

    const prices = await prisma.clientProductPrice.findMany({
      where,
      include: {
        client: true,
        product: true
      },
      orderBy: [
        { client: { name: 'asc' } },
        { product: { name: 'asc' } }
      ]
    });

    const formatted = prices.map(cp => {
      const cost = toDecimal(cp.product.manufacturingCost).toNumber();
      const selling = toDecimal(cp.sellingPrice).toNumber();
      const profit = selling - cost;
      const margin = selling > 0 ? (profit / selling) * 100 : 0;
      const markup = cost > 0 ? (profit / cost) * 100 : 0;

      return {
        id: cp.id,
        clientId: cp.clientId,
        clientName: cp.client.name,
        clientCode: cp.client.code,
        productId: cp.productId,
        productName: cp.product.name,
        sku: cp.product.sku,
        category: cp.product.category,
        manufacturingCost: cost,
        recommendedSellingPrice: toDecimal(cp.product.recommendedSellingPrice).toNumber(),
        sellingPrice: selling,
        profit: Number(profit.toFixed(2)),
        markup: Number(markup.toFixed(2)),
        profitMargin: Number(margin.toFixed(2)),
        isActive: cp.isActive,
        updatedAt: cp.updatedAt
      };
    });

    res.json(formatted);
  } catch (error) {
    next(error);
  }
};

// POST /api/client-prices (Upsert client pricing)
const upsertClientPrice = async (req, res, next) => {
  try {
    const { clientId, productId, sellingPrice } = req.body;
    const manufacturerId = req.user.manufacturerId;

    if (!clientId || !productId || sellingPrice === undefined || isNaN(Number(sellingPrice))) {
      return res.status(400).json({ error: 'Client ID, Product ID, and valid selling price are required' });
    }

    const price = toDecimal(sellingPrice);
    if (price.isNegative()) {
      return res.status(400).json({ error: 'Selling price cannot be negative' });
    }

    const product = await prisma.product.findFirst({ where: { id: Number(productId), manufacturerId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const client = await prisma.client.findFirst({ where: { id: Number(clientId), manufacturerId } });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const cost = toDecimal(product.manufacturingCost);
    const profit = price.minus(cost);
    const markup = cost.greaterThan(0) ? profit.dividedBy(cost).times(100) : toDecimal(0);
    const margin = price.greaterThan(0) ? profit.dividedBy(price).times(100) : toDecimal(0);

    const existing = await prisma.clientProductPrice.findFirst({
      where: {
        clientId_productId: {
          clientId: Number(clientId),
          productId: Number(productId)
        },
        manufacturerId
      }
    });

    let result;
    if (existing) {
      // Record price history
      const oldPrice = toDecimal(existing.sellingPrice);
      const diff = price.minus(oldPrice);
      const changePct = oldPrice.greaterThan(0) ? diff.dividedBy(oldPrice).times(100) : toDecimal(0);

      await prisma.clientPriceHistory.create({
        data: {
          manufacturerId,
          clientId: Number(clientId),
          productId: Number(productId),
          previousPrice: oldPrice,
          newPrice: price,
          difference: diff,
          changePct
        }
      });

      result = await prisma.clientProductPrice.update({
        where: { id: existing.id },
        data: {
          sellingPrice: price,
          profit,
          markup,
          profitMargin: margin,
          updatedAt: new Date()
        },
        include: { client: true, product: true }
      });
    } else {
      result = await prisma.clientProductPrice.create({
        data: {
          manufacturerId,
          clientId: Number(clientId),
          productId: Number(productId),
          sellingPrice: price,
          profit,
          markup,
          profitMargin: margin
        },
        include: { client: true, product: true }
      });
    }

    await prisma.auditLog.create({
      data: {
        manufacturerId,
        userId: req.user?.id,
        action: existing ? 'UPDATE_CLIENT_PRICE' : 'CREATE_CLIENT_PRICE',
        entity: 'ClientProductPrice',
        entityId: result.id,
        details: `Set selling price for ${result.product.name} to client ${result.client.name} as ₹${price.toFixed(2)}`
      }
    });

    res.status(200).json({
      id: result.id,
      clientId: result.clientId,
      clientName: result.client.name,
      productId: result.productId,
      productName: result.product.name,
      sellingPrice: price.toNumber(),
      profit: profit.toNumber(),
      markup: markup.toNumber(),
      profitMargin: margin.toNumber()
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/client-prices/:id
const deleteClientPrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const manufacturerId = req.user.manufacturerId;

    const existing = await prisma.clientProductPrice.findFirst({
      where: { id: Number(id), manufacturerId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Client price not found' });
    }

    await prisma.clientProductPrice.delete({ where: { id: Number(id) } });
    res.json({ message: 'Client price custom override removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClientPrices,
  upsertClientPrice,
  deleteClientPrice
};
