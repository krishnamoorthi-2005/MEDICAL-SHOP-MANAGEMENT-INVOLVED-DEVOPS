import DailySalesSummary from '../models/DailySalesSummary.js';
import StockLedger from '../models/StockLedger.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Batch from '../models/Batch.js';
import Medicine from '../models/Medicine.js';
import Supplier from '../models/Supplier.js';

const toLocalDateString = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const normalizePaymentMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';

  if (['upi', 'online', 'gpay', 'googlepay', 'phonepe', 'paytm', 'scan', 'qr'].includes(normalized)) {
    return 'upi';
  }

  if (['cash', 'cashondelivery', 'cod'].includes(normalized)) {
    return 'cash';
  }

  if (['card', 'debit', 'credit'].includes(normalized)) {
    return 'card';
  }

  return normalized;
};

const parseRange = ({ range, startDate, endDate }) => {
  // Always end at the current moment (end of today)
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : new Date(now);
    start.setHours(0, 0, 0, 0);

    const endOverride = endDate ? new Date(endDate) : end;
    endOverride.setHours(23, 59, 59, 999);

    return { start, end: endOverride };
  }

  // Define the number of days to go back
  let daysBack = 7;
  if (range === '30days') daysBack = 30;
  if (range === '90days') daysBack = 90;

  // Start from the beginning of today and subtract days
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (daysBack - 1)); // -1 to include today

  return { start, end };
};

// Shared dead stock computation using STOCK LEDGER ONLY
// Dead stock definition (calculated per week - default 7 days):
//  - quantityRemaining > 0 (from stock_ledger movements)
//  - AND (no sale ever OR last sale older than weekly cutoff)
//  - AND batch + medicine still exist (no ghosts)
// This identifies products that haven't moved in the past week
const computeDeadStock = async (cutoffDays = 7) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

  const pipeline = [
    {
      $group: {
        _id: '$batchId',
        quantityRemaining: { $sum: '$quantity' },
        lastSaleDate: {
          $max: {
            $cond: [
              { $eq: ['$type', 'SALE'] },
              '$createdAt',
              null,
            ],
          },
        },
      },
    },
    {
      $match: {
        quantityRemaining: { $gt: 0 },
      },
    },
    {
      $lookup: {
        from: 'batches',
        localField: '_id',
        foreignField: '_id',
        as: 'batch',
      },
    },
    { $unwind: '$batch' },
    {
      $lookup: {
        from: 'medicines',
        localField: 'batch.medicineId',
        foreignField: '_id',
        as: 'medicine',
      },
    },
    { $unwind: '$medicine' },
    {
      $match: {
        'medicine.discontinued': { $ne: true },
        $or: [
          { lastSaleDate: null },
          { lastSaleDate: { $lt: cutoffDate } },
        ],
      },
    },
    {
      $lookup: {
        from: 'suppliers',
        localField: 'batch.supplierId',
        foreignField: '_id',
        as: 'supplier',
      },
    },
    { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        totalValue: {
          $multiply: [
            '$quantityRemaining',
            { $ifNull: ['$batch.purchasePrice', 0] },
          ],
        },
      },
    },
  ];

  const docs = await StockLedger.aggregate(pipeline);

  const deadStock = docs.map((doc) => ({
    batchId: doc._id,
    medicineId: doc.batch.medicineId,
    medicineName: doc.medicine.name,
    batchNumber: doc.batch.batchNumber,
    expiryDate: doc.batch.expiryDate,
    quantity: doc.quantityRemaining,
    quantityRemaining: doc.quantityRemaining,
    purchasePrice: doc.batch.purchasePrice || 0,
    totalValue: doc.totalValue || 0,
    lastSoldDate: doc.lastSaleDate,
    daysUnsold: doc.lastSaleDate
      ? Math.floor(
          (Date.now() - new Date(doc.lastSaleDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0,
    supplierName: doc.supplier?.name || 'Unknown',
    rackLocation: doc.medicine.rackLocation,
  }));

  const totalValue = deadStock.reduce(
    (sum, item) => sum + (item.totalValue || 0),
    0,
  );

  // Count unique products (medicines), not total quantity
  const uniqueMedicineIds = new Set(deadStock.map((item) => item.medicineId.toString()));
  const totalItems = uniqueMedicineIds.size;

  return { batches: deadStock, totalValue, totalItems };
};

export const getReportsAnalytics = async (req, res) => {
  try {
    const { range, startDate, endDate } = req.query;
    const { start, end } = parseRange({ range, startDate, endDate });
    const startStr = toLocalDateString(start);
    const endStr = toLocalDateString(end);
    
    console.log('📊 Reports Analytics Request:', { range, startDate, endDate, start: startStr, end: endStr });
    
    // === SALES + PROFIT (LEDGER-ONLY) ===
    // Derive per-day sales and profit from StockLedger SALE movements.
    const ledgerSalesAgg = await StockLedger.aggregate([
      {
        $match: {
          type: 'SALE',
          createdAt: { $gte: start, $lte: end },
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
          quantityAbs: { $abs: '$quantity' },
          sellingPrice: { $ifNull: ['$sellingPrice', 0] },
          purchasePrice: { $ifNull: ['$purchasePrice', 0] },
        },
      },
      {
        $group: {
          _id: '$date',
          totalRevenue: {
            $sum: {
              $multiply: ['$quantityAbs', '$sellingPrice'],
            },
          },
          totalCost: {
            $sum: {
              $multiply: ['$quantityAbs', '$purchasePrice'],
            },
          },
          itemsSold: { $sum: '$quantityAbs' },
        },
      },
      {
        $addFields: {
          netProfit: {
            $max: [0, { $subtract: ['$totalRevenue', '$totalCost'] }],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Bill counts and invoice totals per day from Sale collection (one bill per invoice)
    const billsPerDayAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
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
          total: 1,
        },
      },
      {
        $group: {
          _id: '$date',
          billCount: { $sum: 1 },
          // Use full invoice total (including tax/discounts) so
          // Sales Trend and payment-mode cards stay consistent.
          invoiceTotal: { $sum: { $ifNull: ['$total', 0] } },
        },
      },
    ]);
    
    console.log('📈 Ledger Sales Aggregation Results:', ledgerSalesAgg.length, 'days');
    console.log('💳 Bills Per Day Results:', billsPerDayAgg.length, 'days');
    console.log('📊 First ledger entry:', ledgerSalesAgg[0]);
    console.log('📊 First bill entry:', billsPerDayAgg[0]);

    const billsMap = new Map(
      billsPerDayAgg.map((b) => [b._id, b.billCount || 0]),
    );
    const invoiceTotalsMap = new Map(
      billsPerDayAgg.map((b) => [b._id, b.invoiceTotal || 0]),
    );

    // Merge ledger-based cost/profit with invoice totals so that
    // revenue numbers match the invoices/payment-mode breakdown.
    const dailySales = ledgerSalesAgg.map((row) => ({
      date: row._id,
      // Prefer invoice totals (includes tax/discount),
      // fall back to ledger revenue if unavailable.
      sales: invoiceTotalsMap.get(row._id) ?? (row.totalRevenue || 0),
      profit: row.netProfit || 0,
      bills: billsMap.get(row._id) || 0,
      itemsSold: row.itemsSold || 0,
    }));

    const totals = dailySales.reduce(
      (acc, d) => {
        acc.totalSales += d.sales || 0;
        acc.netProfit += d.profit || 0;
        acc.billCount += d.bills || 0;
        acc.itemsSold += d.itemsSold || 0;
        return acc;
      },
      { totalSales: 0, netProfit: 0, billCount: 0, itemsSold: 0 },
    );

    // Payment mode distribution aggregated from sales
    const rawPaymentModes = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $toLower: { $ifNull: ['$paymentMethod', 'unknown'] } },
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
      {
        $project: {
          _id: 0,
          mode: '$_id',
          count: 1,
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);
    
    const paymentModeMap = new Map();
    rawPaymentModes.forEach((row) => {
      const mode = normalizePaymentMode(row.mode);
      const current = paymentModeMap.get(mode) || { mode, count: 0, total: 0 };
      current.count += row.count || 0;
      current.total += row.total || 0;
      paymentModeMap.set(mode, current);
    });

    const paymentModes = ['cash', 'upi', 'card'].map((mode) => paymentModeMap.get(mode) || { mode, count: 0, total: 0 });

    const unknownPaymentModes = Array.from(paymentModeMap.values()).filter((row) => !['cash', 'upi', 'card'].includes(row.mode));
    paymentModes.push(...unknownPaymentModes);

    console.log('💰 Payment Modes Results:', paymentModes.length, 'modes', paymentModes);

    // Expiry loss from EXPIRED_WRITE_OFF entries
    const expiryAggregation = await StockLedger.aggregate([
      {
        $match: {
          type: { $in: ['EXPIRED', 'EXPIRED_WRITE_OFF'] },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          // Loss at cost: purchasePrice * quantity
          expiryLoss: {
            $sum: {
              $multiply: [
                { $abs: '$quantity' },
                {
                  $ifNull: [
                    '$purchasePrice',
                    { $ifNull: ['$unitPrice', 0] },
                  ],
                },
              ],
            },
          },
          expiredItemCount: { $sum: { $abs: '$quantity' } },
        },
      },
    ]);

    // Calculate value of expired items still in stock (not yet written off)
    const expiredInStock = await Batch.aggregate([
      {
        $match: {
          expiryDate: { $lt: new Date() },
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
    ]);

    const writtenOffLoss = expiryAggregation[0]?.expiryLoss || 0;
    const writtenOffCount = expiryAggregation[0]?.expiredItemCount || 0;
    const expiredInStockValue = expiredInStock[0]?.totalExpiredValue || 0;
    const expiredInStockCount = expiredInStock[0]?.totalExpiredQty || 0;
    const expiryLoss = writtenOffLoss + expiredInStockValue;
    const expiredItemCount = writtenOffCount + expiredInStockCount;
    
    console.log('📊 Expiry Loss Breakdown:', {
      writtenOffLoss,
      writtenOffCount,
      expiredInStockValue,
      expiredInStockCount,
      totalExpiryLoss: expiryLoss,
      totalExpiredItems: expiredItemCount
    });

    // Top selling items from Sale items
    const topSellingItems = await Sale.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.medicineName',
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          quantity: 1,
          revenue: 1,
        },
      },
    ]);

    // Recent invoices
    const recentInvoicesDocs = await Sale.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('invoiceNumber total paymentMethod items createdAt')
      .lean();

    const recentInvoices = recentInvoicesDocs.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      total: inv.total,
      paymentMethod: inv.paymentMethod,
      items: inv.items?.length || 0,
      createdAt: inv.createdAt,
    }));
    
    console.log('🏆 Top Selling Items:', topSellingItems.length, 'items');
    console.log('🧾 Recent Invoices:', recentInvoices.length, 'invoices');
    console.log('📋 First invoice:', recentInvoices[0]);

    // Purchase totals for the period
    const purchaseAgg = await Purchase.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totalAmount' },
          purchaseCount: { $sum: 1 },
        },
      },
    ]);

    const purchaseSummary = {
      totalPurchases: purchaseAgg[0]?.totalPurchases || 0,
      purchaseCount: purchaseAgg[0]?.purchaseCount || 0,
    };

    // Dead stock summary reuses the same logic as the detailed report
    const { totalValue: deadStockValue, totalItems: deadStockItems } = await computeDeadStock(7);

    const data = {
      range: { start: startStr, end: endStr },
      totals,
      dailySales,
      paymentModes,
      topSellingItems,
      recentInvoices,
      expiryLoss,
      expiredItemCount,
      purchaseSummary,
      deadStockValue,
      deadStockItems,
    };
    
    console.log('✅ FINAL REPORT DATA:', {
      dateRange: data.range,
      totals: data.totals,
      dailySalesCount: data.dailySales.length,
      paymentModesCount: data.paymentModes.length,
      topItemsCount: data.topSellingItems.length,
      recentInvoicesCount: data.recentInvoices.length,
      expiryLoss: data.expiryLoss,
      deadStockItems: data.deadStockItems,
    });

    res.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('❌ Reports analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get reports analytics'
    });
  }
};

// Detailed list of expired items contributing to expiry loss
export const getExpiryLossDetails = async (req, res) => {
  try {
    const expiredItems = await StockLedger.find({
      type: { $in: ['EXPIRED', 'EXPIRED_WRITE_OFF'] },
    })
      .sort({ createdAt: -1 })
      .populate('medicineId')
      .lean();

    const items = expiredItems.map((item) => ({
      medicineId: item.medicineId?._id || item.medicineId,
      batchId: item.batchId,
      medicineName: item.medicineName || item.medicineId?.name || 'Unknown',
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      quantityExpired: Math.abs(item.quantity || 0),
      unitPrice: item.purchasePrice || item.unitPrice || 0,
      totalLoss:
        item.totalLoss ||
        Math.abs(item.quantity || 0) * (item.purchasePrice || item.unitPrice || 0),
      reason: item.reason,
      createdAt: item.createdAt,
    }));

    const totalLoss = items.reduce((sum, it) => sum + (it.totalLoss || 0), 0);
    const totalItems = items.reduce((sum, it) => sum + (it.quantityExpired || 0), 0);

    // Derive a simple date range from the earliest/latest expired items
    let rangeStart = '';
    let rangeEnd = '';
    if (expiredItems.length > 0) {
      const dates = expiredItems
        .map((it) => it.createdAt)
        .filter(Boolean)
        .map((d) => new Date(d));
      if (dates.length > 0) {
        const min = new Date(Math.min(...dates.map((d) => d.getTime())));
        const max = new Date(Math.max(...dates.map((d) => d.getTime())));
        rangeStart = toLocalDateString(min);
        rangeEnd = toLocalDateString(max);
      }
    }

    res.json({
      success: true,
      data: {
        range: { start: rangeStart, end: rangeEnd },
        summary: { totalLoss, totalItems },
        items,
      },
    });
  } catch (error) {
    console.error('❌ Expiry loss details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get expiry loss details',
    });
  }
};

// Sales trend derived purely from StockLedger SALE movements
export const getSalesTrend = async (req, res) => {
  try {
    const data = await StockLedger.aggregate([
      {
        $match: { type: 'SALE' },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          total: {
            $sum: {
              $multiply: [
                { $abs: '$quantity' },
                { $ifNull: ['$sellingPrice', 0] },
              ],
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json(data);
  } catch (error) {
    console.error('❌ Sales trend error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get sales trend',
    });
  }
};

// Admin utility: reclassify all EXPIRED_WRITE_OFF entries so
// expiry loss analytics are effectively reset to zero while
// keeping historical quantity movements intact.
export const resetExpiryLoss = async (req, res) => {
  try {
    const result = await StockLedger.updateMany(
      { type: 'EXPIRED_WRITE_OFF' },
      {
        $set: {
          type: 'ADJUSTMENT_REMOVE',
          reason: 'Reset expiry loss',
        },
      },
    );

    res.json({
      success: true,
      message: 'Expiry loss reset successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('❌ Reset expiry loss error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset expiry loss',
    });
  }
};

export const getDeadStockReport = async (req, res) => {
  try {
    const { batches, totalValue, totalItems } = await computeDeadStock(7);

    res.json({
      success: true,
      totalValue,
      totalItems,
      batches,
    });
  } catch (error) {
    console.error('❌ Dead stock report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dead stock report',
    });
  }
};

// Generate test data for reports (for development/testing)
export const generateTestData = async (req, res) => {
  try {
    console.log('🔄 Generating test sales data...');
    
    // First, get or create test medicines
    let medicines = await Medicine.find().limit(5).lean();
    if (!medicines || medicines.length === 0) {
      // If no medicines exist, create some test medicines
      const medicineNames = ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Amoxicillin 500mg', 'Vitamin C 1000mg', 'Aspirin 75mg'];
      medicines = await Medicine.insertMany(
        medicineNames.map((name) => ({
          name,
          genericName: name.split(' ')[0],
          dosage: name.match(/\d+/)?.[0] || '500',
          unit: 'mg',
          category: 'General',
          manufacturer: 'Test Pharma',
        }))
      );
    }
    
    // Create/find test batches
    let batches = await Batch.find({ medicineId: medicines[0]._id }).lean();
    if (!batches || batches.length === 0) {
      batches = await Batch.insertMany(
        medicines.slice(0, 3).map((med, idx) => ({
          medicineId: med._id,
          batchNumber: `TEST-${Date.now()}-${idx}`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          purchasePrice: 10 + Math.random() * 20,
          mrp: 20 + Math.random() * 40,
          quantityAvailable: 100,
          quantityPurchased: 100,
        }))
      );
    }
    
    // Generate sales for the last 7 days
    const salesCount = 10;
    const paymentMethods = ['cash', 'card', 'online', 'cheque'];
    const generatedSales = [];
    
    for (let i = 0; i < salesCount; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - daysAgo);
      saleDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      const batch = batches[Math.floor(Math.random() * batches.length)];
      const quantity = Math.floor(2 + Math.random() * 8);
      const unitPrice = batch.mrp || 30;
      const subtotal = quantity * unitPrice;
      const taxAmount = subtotal * 0.05;
      const discountAmount = Math.floor(Math.random() * 50);
      const total = subtotal + taxAmount - discountAmount;
      
      const sale = await Sale.create({
        invoiceNumber: `INV-TEST-${Date.now()}-${i}`,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        items: [{
          medicineId: batch.medicineId,
          medicineName: medicines.find(m => m._id.equals(batch.medicineId))?.name || 'Test Medicine',
          batchId: batch._id,
          quantity,
          unitPrice,
          lineTotal: quantity * unitPrice,
        }],
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentStatus: 'paid',
        createdAt: saleDate,
      });
      
      // Create corresponding stock ledger entry
      await StockLedger.recordMovement({
        medicineId: batch.medicineId,
        batchId: batch._id,
        type: 'SALE',
        quantity: -quantity,
        previousStock: 100,
        newStock: 100 - quantity,
        referenceType: 'invoice',
        referenceId: sale._id,
        reason: `Test Sale - ${sale.invoiceNumber}`,
        unitPrice: batch.purchasePrice,
        purchasePrice: batch.purchasePrice,
        sellingPrice: unitPrice,
        totalValue: quantity * batch.purchasePrice,
      });
      
      generatedSales.push(sale);
    }
    
    res.json({
      success: true,
      message: `Generated ${generatedSales.length} test sales`,
      data: {
        salesCreated: generatedSales.length,
        medicinesUsed: medicines.length,
        batchesUsed: batches.length,
      },
    });
  } catch (error) {
    console.error('❌ Test data generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate test data',
    });
  }
};