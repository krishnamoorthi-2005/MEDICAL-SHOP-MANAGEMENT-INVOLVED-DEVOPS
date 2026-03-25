import Sale from '../models/Sale.js';
import Medicine from '../models/Medicine.js';
import Batch from '../models/Batch.js';
import StockLedger from '../models/StockLedger.js';

const toLocalDateString = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const toDisplayDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return 'N/A';
  }
  return toLocalDateString(d);
};

const buildInventoryAlertData = async ({ limit = 10 } = {}) => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const medicines = await Medicine.find({ discontinued: { $ne: true } }).lean();
  if (medicines.length === 0) {
    return { lowStockCount: 0, lowStockItems: [], expiringSoonCount: 0, expiringSoonBatchCount: 0, expiringSoonValue: 0, expiringSoonItems: [], expiredCount: 0, expiredBatchCount: 0, expiredValue: 0, expiredItems: [] };
  }

  const medicineIds = medicines.map(m => m._id);

  // Single batch query instead of N+1
  const [allBatches, ledgerBalances] = await Promise.all([
    Batch.find({ medicineId: { $in: medicineIds } }).lean(),
    StockLedger.aggregate([
      { $match: { medicineId: { $in: medicineIds } } },
      { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
    ]),
  ]);

  const balanceMap = new Map(ledgerBalances.map(s => [s._id.toString(), s.quantity || 0]));
  const batchesByMed = new Map();
  for (const b of allBatches) {
    const key = b.medicineId.toString();
    if (!batchesByMed.has(key)) batchesByMed.set(key, []);
    batchesByMed.get(key).push(b);
  }

  const lowStockItems = [];
  const expiringSoonItems = [];
  const expiredItems = [];

  for (const med of medicines) {
    const batches = batchesByMed.get(med._id.toString()) || [];
    if (batches.length === 0) continue;

    const totalStock = batches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);

    const minStockLevel = med.minStockLevel ?? 0;
    if (minStockLevel > 0 && totalStock < minStockLevel) {
      lowStockItems.push({ name: med.name, stock: totalStock, minStockLevel });
    }

    const expiringBatches = batches.filter(b => {
      const qty = balanceMap.get(b._id.toString()) || 0;
      const expiry = new Date(b.expiryDate);
      return expiry <= thirtyDaysFromNow && expiry >= now && qty > 0;
    });

    if (expiringBatches.length > 0) {
      const expiringValue = expiringBatches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0) * (b.mrp || 0), 0);
      const nextExpiry = expiringBatches.reduce((min, b) => new Date(b.expiryDate) < new Date(min.expiryDate) ? b : min, expiringBatches[0]);
      expiringSoonItems.push({ name: med.name, value: expiringValue, batches: expiringBatches.length, nextExpiryDate: nextExpiry.expiryDate });
    }

    const expiredBatches = batches.filter(b => {
      const qty = balanceMap.get(b._id.toString()) || 0;
      return new Date(b.expiryDate) < now && qty > 0;
    });

    if (expiredBatches.length > 0) {
      const expiredValue = expiredBatches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0) * (b.mrp || 0), 0);
      const expiredQty = expiredBatches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);
      const oldestExpired = expiredBatches.reduce((min, b) => new Date(b.expiryDate) < new Date(min.expiryDate) ? b : min, expiredBatches[0]);
      expiredItems.push({ name: med.name, value: expiredValue, quantity: expiredQty, batches: expiredBatches.length, oldestExpiryDate: oldestExpired.expiryDate });
    }
  }

  const sortByName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
  lowStockItems.sort((a, b) => (a.stock - b.stock) || sortByName(a, b));
  expiringSoonItems.sort((a, b) => new Date(a.nextExpiryDate) - new Date(b.nextExpiryDate));
  expiredItems.sort((a, b) => new Date(a.oldestExpiryDate) - new Date(b.oldestExpiryDate));

  return {
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, limit),
    expiringSoonCount: expiringSoonItems.length,
    expiringSoonBatchCount: expiringSoonItems.reduce((sum, item) => sum + (item.batches || 0), 0),
    expiringSoonValue: expiringSoonItems.reduce((sum, item) => sum + (item.value || 0), 0),
    expiringSoonItems: expiringSoonItems.slice(0, limit),
    expiredCount: expiredItems.length,
    expiredBatchCount: expiredItems.reduce((sum, item) => sum + (item.batches || 0), 0),
    expiredValue: expiredItems.reduce((sum, item) => sum + (item.value || 0), 0),
    expiredItems: expiredItems.slice(0, limit),
  };
};

// GET DASHBOARD ANALYTICS
export const getDashboardAnalytics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const alertData = await buildInventoryAlertData({ limit: 10 });

    // Get top selling items (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSales = await Sale.find({ 
      createdAt: { $gte: sevenDaysAgo } 
    }).lean();

    const itemSales = {};
    recentSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemSales[item.medicineName]) {
          itemSales[item.medicineName] = { quantity: 0, revenue: 0 };
        }
        itemSales[item.medicineName].quantity += item.quantity;
        itemSales[item.medicineName].revenue += item.lineTotal;
      });
    });

    const topItems = Object.entries(itemSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Get recent transactions (last 10)
    const recentTransactions = await Sale.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get last 7 days sales trend from StockLedger (SALE movements only)
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 6);
    trendStart.setHours(0, 0, 0, 0);

    const trendAgg = await StockLedger.aggregate([
      {
        $match: {
          type: 'SALE',
          createdAt: { $gte: trendStart },
        },
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          revenue: {
            $multiply: [
              { $abs: '$quantity' },
              {
                $ifNull: [
                  '$sellingPrice',
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$date',
          sales: { $sum: '$revenue' },
        },
      },
    ]);

    const trendMap = new Map(trendAgg.map((t) => [t._id, t.sales]));
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = toLocalDateString(date);

      salesTrend.push({
        date: dateString,
        sales: trendMap.get(dateString) || 0,
      });
    }

    // === Ledger-based financial summary for today ===
    // Get actual sales totals from Sale model to account for discounts/taxes
    const [salesToday, stockLedgerCOGS, expiredAgg, expiredInStockAgg] = await Promise.all([
      Sale.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).lean(),
      StockLedger.aggregate([
        {
          $match: {
            type: 'SALE',
            createdAt: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: '$referenceId',
            totalCostOfGoodsSold: {
              $sum: {
                $multiply: [
                  { $abs: '$quantity' },
                  { $ifNull: ['$purchasePrice', 0] },
                ],
              },
            },
            itemsSold: { $sum: { $abs: '$quantity' } },
          },
        },
      ]),
      StockLedger.aggregate([
        {
          $match: {
            type: 'EXPIRED_WRITE_OFF',
            createdAt: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: null,
            totalLoss: { $sum: '$totalValue' },
          },
        },
      ]),
      // Calculate value of expired items still in stock
      Batch.aggregate([
        {
          $match: {
            expiryDate: { $lt: today },
            quantityAvailable: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            totalExpiredValue: {
              $sum: {
                $multiply: ['$quantityAvailable', '$purchasePrice'],
              },
            },
            totalExpiredQty: { $sum: '$quantityAvailable' },
          },
        },
      ]),
    ]);

    // Calculate totals from actual Sale records (includes discounts/taxes)
    const billCount = salesToday.length;
    const totalSales = salesToday.reduce((sum, s) => sum + (s.total || 0), 0);
    const itemsSold = salesToday.reduce((sum, s) => {
      return sum + (s.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0);
    }, 0);

    // Get COGS from ledger (actual purchase prices paid for items sold)
    const cogsMap = new Map(
      stockLedgerCOGS.map((c) => [c._id?.toString(), c.totalCostOfGoodsSold || 0])
    );
    const totalCostOfGoodsSold = salesToday.reduce((sum, sale) => {
      return sum + (cogsMap.get(sale._id.toString()) || 0);
    }, 0);

    const writtenOffLoss = expiredAgg[0]?.totalLoss || 0;
    const expiredInStockValue = expiredInStockAgg[0]?.totalExpiredValue || 0;

    // Net profit = Actual revenue (after discounts/taxes) - Cost of goods sold
    // This gives the true profit based on what customers actually paid
    // vs what we paid to purchase those items
    const netProfit = totalSales - totalCostOfGoodsSold;

    // Expose the raw net profit value directly to the UI
    // so it can show profit or loss instead of clamping
    // negative values to zero.
    const displayProfit = netProfit;

    console.log('📊 Dashboard Financial Summary:', {
      billCount,
      totalSalesRevenue: totalSales.toFixed(2),
      totalCOGS: totalCostOfGoodsSold.toFixed(2),
      netProfit: netProfit.toFixed(2),
      writtenOffLossToday: writtenOffLoss,
      expiredInStockValue,
      itemsSold,
      expiredQtyInStock: expiredInStockAgg[0]?.totalExpiredQty || 0
    });

    const todaySummary = {
      totalSales,
      totalRevenue: totalSales,
      billCount,
      itemsSold,
      profit: displayProfit,
      date: toLocalDateString(today),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: {
        todaySummary,
        lowStockCount: alertData.lowStockCount,
        lowStockItems: alertData.lowStockItems,
        expiringSoonCount: alertData.expiringSoonCount,
        expiringSoonBatchCount: alertData.expiringSoonBatchCount,
        expiringSoonValue: alertData.expiringSoonValue,
        expiringSoonItems: alertData.expiringSoonItems,
        expiredCount: alertData.expiredCount,
        expiredBatchCount: alertData.expiredBatchCount,
        expiredValue: alertData.expiredValue,
        expiredItems: alertData.expiredItems,
        topSellingItems: topItems,
        recentTransactions: recentTransactions.map(t => ({
          invoiceNumber: t.invoiceNumber,
          total: t.total,
          items: t.items.length,
          createdAt: t.createdAt
        })),
        salesTrend
      }
    });
  } catch (error) {
    console.error('❌ Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get frequently purchased items (for quick billing)
export const getFrequentItems = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get sales from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await Sale.find({ 
      createdAt: { $gte: thirtyDaysAgo } 
    }).lean();

    // Count medicine purchases
    const itemFrequency = {};
    recentSales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.medicineId;
        if (!itemFrequency[key]) {
          itemFrequency[key] = {
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            count: 0,
            totalQuantity: 0
          };
        }
        itemFrequency[key].count += 1;
        itemFrequency[key].totalQuantity += item.quantity;
      });
    });

    // Sort by frequency and get medicine details
    const frequentItemIds = Object.values(itemFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, parseInt(limit))
      .map(item => item.medicineId);

    // Get full medicine details
    const medicines = await Medicine.find({ 
      _id: { $in: frequentItemIds },
      discontinued: { $ne: true }
    })
      .populate('genericId', 'name')
      .populate('manufacturerId', 'name')
      .lean();

    // Get stock info for each medicine — batch query, no N+1
    const medIds = medicines.map(m => m._id);
    const [allBatches, ledgerBalances] = await Promise.all([
      Batch.find({ medicineId: { $in: medIds } }).sort({ expiryDate: 1 }).lean(),
      StockLedger.aggregate([
        { $match: { medicineId: { $in: medIds } } },
        { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
      ]),
    ]);

    const balanceMap = new Map(ledgerBalances.map(s => [s._id.toString(), s.quantity || 0]));
    const batchesByMed = new Map();
    for (const b of allBatches) {
      const key = b.medicineId.toString();
      if (!batchesByMed.has(key)) batchesByMed.set(key, []);
      batchesByMed.get(key).push(b);
    }

    const medicinesWithStock = medicines.map(med => {
      const batches = batchesByMed.get(med._id.toString()) || [];
      const totalStock = batches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);
      const firstInStockBatch = batches.find(b => (balanceMap.get(b._id.toString()) || 0) > 0);
      const mrp = firstInStockBatch?.mrp || 0;

      return {
        _id: med._id,
        name: med.name,
        genericId: med.genericId,
        manufacturerId: med.manufacturerId,
        category: med.category,
        stock: totalStock,
        mrp,
        inStock: totalStock > 0,
        purchaseCount: itemFrequency[med._id.toString()]?.count || 0,
      };
    });

    // Sort by original frequency order
    const sortedMedicines = medicinesWithStock.sort((a, b) => 
      frequentItemIds.indexOf(a._id.toString()) - frequentItemIds.indexOf(b._id.toString())
    );

    res.json({
      success: true,
      data: sortedMedicines.filter(m => m.inStock)
    });
  } catch (error) {
    console.error('❌ Get frequent items error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
