const prisma = require('../lib/prisma');
const { toDecimal } = require('../utils/decimalUtils');
const { getTenantContext } = require('../middleware/auth');

// GET /api/dashboard
const getDashboardData = async (req, res, next) => {
  try {
    const { manufacturerId } = getTenantContext(req);
    
    const [
      totalProducts,
      totalComponents,
      totalRawMaterials,
      totalClients,
      products,
      recentPriceChanges,
      sales,
      clients
    ] = await Promise.all([
      prisma.product.count({ where: { isArchived: false, manufacturerId } }),
      prisma.component.count({ where: { isArchived: false, manufacturerId } }),
      prisma.rawMaterial.count({ where: { isArchived: false, manufacturerId } }),
      prisma.client.count({ where: { isArchived: false, manufacturerId } }),
      prisma.product.findMany({
        where: { isArchived: false, manufacturerId },
        include: { clientPrices: true }
      }),
      prisma.rawMaterialPriceHistory.findMany({
        where: { manufacturerId },
        take: 10,
        orderBy: { changedAt: 'desc' },
        include: { rawMaterial: true }
      }),
      prisma.sale.findMany({
        where: { manufacturerId },
        orderBy: { date: 'asc' },
        include: { client: true, product: true }
      }),
      prisma.client.findMany({
        where: { isArchived: false, manufacturerId },
        include: {
          productPrices: {
            include: { product: true }
          }
        }
      })
    ]);

    // Product cost increase / decrease analytics
    let productsCostIncrease = 0;
    let productsCostDecrease = 0;
    let totalMfgCostSum = 0;
    const productsRequiringAttention = [];

    for (const p of products) {
      const currentCost = toDecimal(p.manufacturingCost).toNumber();
      const prevCost = p.previousManufacturingCost ? toDecimal(p.previousManufacturingCost).toNumber() : currentCost;
      const costDiff = currentCost - prevCost;
      const recPrice = toDecimal(p.recommendedSellingPrice).toNumber();
      const givenPrice = p.givenSellingPrice ? toDecimal(p.givenSellingPrice).toNumber() : null;
      const currentSellingPrice = givenPrice || recPrice;
      
      const currentProfit = currentSellingPrice - currentCost;
      const recommendedProfit = recPrice - currentCost;
      const profitDiff = currentProfit - (currentSellingPrice - prevCost);

      totalMfgCostSum += currentCost;

      if (costDiff > 0) {
        productsCostIncrease++;
      } else if (costDiff < 0) {
        productsCostDecrease++;
      }

      // Products requiring attention: either cost changed significantly or profit is eroded
      if (Math.abs(costDiff) > 0.01 || currentProfit < 0 || (givenPrice && givenPrice < recPrice)) {
        productsRequiringAttention.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          oldCost: Number(prevCost.toFixed(2)),
          newCost: Number(currentCost.toFixed(2)),
          costDifference: Number(costDiff.toFixed(2)),
          costDifferencePct: prevCost > 0 ? Number(((costDiff / prevCost) * 100).toFixed(2)) : 0,
          currentSellingPrice: Number(currentSellingPrice.toFixed(2)),
          recommendedSellingPrice: Number(recPrice.toFixed(2)),
          currentProfit: Number(currentProfit.toFixed(2)),
          profitDifference: Number(profitDiff.toFixed(2)),
          status: costDiff > 0 ? 'increase' : costDiff < 0 ? 'decrease' : 'margin_alert'
        });
      }
    }

    const avgMfgCost = totalProducts > 0 ? totalMfgCostSum / totalProducts : 0;

    // Sales metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    const monthlyMap = new Map();
    for (const s of sales) {
      const rev = toDecimal(s.revenue).toNumber();
      const cost = toDecimal(s.totalCost).toNumber();
      const prof = toDecimal(s.profit).toNumber();

      totalRevenue += rev;
      totalCost += cost;
      totalProfit += prof;

      const mKey = new Date(s.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyMap.has(mKey)) {
        monthlyMap.set(mKey, { month: mKey, revenue: 0, cost: 0, profit: 0 });
      }
      const mObj = monthlyMap.get(mKey);
      mObj.revenue += rev;
      mObj.cost += cost;
      mObj.profit += prof;
    }

    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Recent raw material price changes formatted
    const formattedRecentChanges = recentPriceChanges.map(rc => {
      const prev = toDecimal(rc.previousPrice).toNumber();
      const current = toDecimal(rc.newPrice).toNumber();
      const diff = toDecimal(rc.difference).toNumber();
      const pct = toDecimal(rc.changePct).toNumber();

      return {
        id: rc.id,
        materialId: rc.rawMaterial.id,
        materialName: rc.rawMaterial.name,
        category: rc.rawMaterial.category,
        unit: rc.rawMaterial.unit,
        oldPrice: Number(prev.toFixed(2)),
        newPrice: Number(current.toFixed(2)),
        difference: Number(diff.toFixed(2)),
        differencePct: Number(pct.toFixed(2)),
        changedAt: rc.changedAt
      };
    });

    // Client-wise profit distribution
    const clientProfitData = clients.map(c => {
      let clientProf = 0;
      let clientRev = 0;
      for (const cp of c.productPrices) {
        if(cp.product.isArchived) continue;
        const prodCost = toDecimal(cp.product.manufacturingCost).toNumber();
        const sellPrice = toDecimal(cp.sellingPrice).toNumber();
        clientProf += (sellPrice - prodCost);
        clientRev += sellPrice;
      }
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        profit: Number(clientProf.toFixed(2)),
        revenue: Number(clientRev.toFixed(2)),
        margin: clientRev > 0 ? Number(((clientProf / clientRev) * 100).toFixed(2)) : 0
      };
    });

    res.json({
      kpis: {
        totalProducts,
        totalComponents,
        totalRawMaterials,
        totalClients,
        recentPriceChangesCount: recentPriceChanges.length,
        productsCostIncrease,
        productsCostDecrease,
        averageManufacturingCost: Number(avgMfgCost.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        averageProfitMargin: Number(avgProfitMargin.toFixed(2))
      },
      recentPriceChanges: formattedRecentChanges,
      productsRequiringAttention,
      monthlyTrends: Array.from(monthlyMap.values()).map(m => ({
        ...m,
        revenue: Number(m.revenue.toFixed(2)),
        cost: Number(m.cost.toFixed(2)),
        profit: Number(m.profit.toFixed(2))
      })),
      clientProfitData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData
};
