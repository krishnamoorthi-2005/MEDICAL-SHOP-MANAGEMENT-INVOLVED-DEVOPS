/**
 * DevOps Report Controller
 * Provides operational health metrics for the pharmacy system:
 * - Sales throughput & revenue summary
 * - Stock movement overview (purchases, write-offs)
 * - Inventory health (low stock, expiry risk)
 * - Write-off loss analysis
 */

import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Medicine from '../models/Medicine.js';
import StockLedger from '../models/StockLedger.js';
import WriteOffLog from '../models/WriteOffLog.js';
import DailySalesSummary from '../models/DailySalesSummary.js';

// Helper: build date range from query params
const getDateRange = (query) => {
  const now = new Date();
  const { range = '7d', startDate, endDate } = query;

  if (startDate && endDate) {
    return { from: new Date(startDate), to: new Date(endDate) };
  }

  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { from, to: now };
};

/**
 * GET /api/devops-report/summary
 * High-level operational summary: sales count, revenue, purchases, write-offs
 */
export const getOperationalSummary = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    const [salesData, purchaseData, writeOffData] = await Promise.all([
      // Total sales & revenue in range
      Sale.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            totalDiscount: { $sum: '$discountAmount' },
            totalTax: { $sum: '$taxAmount' },
          },
        },
      ]),

      // Purchase orders in range
      Purchase.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),

      // Write-off losses in range
      WriteOffLog.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 },
            totalLoss: { $sum: '$financialLoss' },
            totalQty: { $sum: '$quantity' },
          },
        },
      ]),
    ]);

    const sales = salesData[0] || { totalSales: 0, totalRevenue: 0, totalDiscount: 0, totalTax: 0 };

    const purchases = { received: 0, upcoming: 0, notReceived: 0, totalSpend: 0 };
    purchaseData.forEach((p) => {
      if (p._id === 'received') { purchases.received = p.count; purchases.totalSpend += p.totalAmount; }
      if (p._id === 'upcoming') purchases.upcoming = p.count;
      if (p._id === 'not received') purchases.notReceived = p.count;
    });

    const writeOffs = { totalLoss: 0, byReason: {} };
    writeOffData.forEach((w) => {
      writeOffs.totalLoss += w.totalLoss;
      writeOffs.byReason[w._id] = { count: w.count, loss: w.totalLoss, qty: w.totalQty };
    });

    res.json({
      period: { from, to },
      sales,
      purchases,
      writeOffs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/devops-report/sales-trend
 * Daily sales count + revenue grouped by day
 */
export const getSalesTrendReport = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    const trend = await Sale.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          salesCount: { $sum: 1 },
          revenue: { $sum: '$total' },
          avgTicket: { $avg: '$total' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', salesCount: 1, revenue: 1, avgTicket: { $round: ['$avgTicket', 2] }, _id: 0 } },
    ]);

    res.json({ period: { from, to }, trend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/devops-report/stock-movements
 * Ledger movement breakdown: purchases in, sales out, write-offs
 */
export const getStockMovementReport = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    const movements = await StockLedger.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQty: { $sum: { $abs: '$quantity' } },
          totalValue: { $sum: '$totalValue' },
          totalLoss: { $sum: '$totalLoss' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ period: { from, to }, movements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/devops-report/inventory-health
 * Medicines below min stock level + total medicine count
 */
export const getInventoryHealthReport = async (req, res) => {
  try {
    const [totalMedicines, discontinued, lowStockBatches] = await Promise.all([
      Medicine.countDocuments({ discontinued: false }),
      Medicine.countDocuments({ discontinued: true }),

      // Medicines where current stock (from ledger) is below minStockLevel
      StockLedger.aggregate([
        {
          $group: {
            _id: '$medicineId',
            currentStock: { $sum: '$quantity' },
          },
        },
        {
          $lookup: {
            from: 'medicines',
            localField: '_id',
            foreignField: '_id',
            as: 'medicine',
          },
        },
        { $unwind: '$medicine' },
        {
          $match: {
            $expr: { $lt: ['$currentStock', '$medicine.minStockLevel'] },
            'medicine.discontinued': false,
          },
        },
        {
          $project: {
            medicineName: '$medicine.name',
            currentStock: 1,
            minStockLevel: '$medicine.minStockLevel',
            deficit: { $subtract: ['$medicine.minStockLevel', '$currentStock'] },
          },
        },
        { $sort: { deficit: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({
      totalActiveMedicines: totalMedicines,
      discontinuedMedicines: discontinued,
      lowStockCount: lowStockBatches.length,
      lowStockItems: lowStockBatches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/devops-report/payment-breakdown
 * Sales grouped by payment method (cash / upi / card)
 */
export const getPaymentBreakdown = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    const breakdown = await Sale.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
      { $project: { method: '$_id', count: 1, total: 1, _id: 0 } },
      { $sort: { total: -1 } },
    ]);

    res.json({ period: { from, to }, breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/devops-report/top-medicines
 * Top selling medicines by quantity in the given period
 */
export const getTopMedicinesReport = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const limit = parseInt(req.query.limit) || 10;

    const topMedicines = await StockLedger.aggregate([
      {
        $match: {
          type: 'SALE',
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$medicineId',
          medicineName: { $first: '$medicineName' },
          totalQtySold: { $sum: { $abs: '$quantity' } },
          totalRevenue: { $sum: '$totalValue' },
        },
      },
      { $sort: { totalQtySold: -1 } },
      { $limit: limit },
      {
        $project: {
          medicineName: 1,
          totalQtySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          _id: 0,
        },
      },
    ]);

    res.json({ period: { from, to }, topMedicines });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
