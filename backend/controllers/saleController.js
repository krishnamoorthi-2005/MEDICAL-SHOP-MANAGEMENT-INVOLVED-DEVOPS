import mongoose from 'mongoose';

import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Batch from '../models/Batch.js';
import StockLedger from '../models/StockLedger.js';
import DailySalesSummary from '../models/DailySalesSummary.js';
import Customer from '../models/Customer.js';

const toLocalDateString = (date = new Date()) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const generateInvoiceNumber = async () => {
  // Use a counter-based approach with atomic increment to prevent
  // duplicate invoice numbers under concurrent requests
  const year = new Date().getFullYear();
  const summary = await DailySalesSummary.findOneAndUpdate(
    { date: `counter-${year}` },
    { $inc: { billCount: 1 } },
    { upsert: true, new: true },
  ).lean();
  const seq = summary.billCount || 1;
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
};

const generateFallbackInvoiceNumber = () => {
  // Fallback: Use timestamp + random number for collision avoidance
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
};

const normalizePaymentMethod = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) return '';
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

// CREATE SALE + UPDATE DAILY SUMMARY USING MONGODB LEDGER
// NOTE: MongoDB transactions require a replica set. To support
// simple local/standalone MongoDB deployments, this implementation
// performs the operations sequentially without using transactions
// or sessions. The stock ledger model still ensures we never
// overwrite existing movements.
export const createSale = async (req, res) => {
  try {
    const { items, customerName, customerId, paymentMethod, discountAmount = 0, taxAmount = 0 } = req.body || {};

    console.log('📝 Sale Request Received:', {
      itemsCount: items?.length || 0,
      paymentMethod,
      customerName,
      customerId,
      taxAmount,
      discountAmount
    });

    if (!Array.isArray(items) || items.length === 0) {
      console.error('❌ Validation failed: No items in sale');
      return res.status(400).json({ success: false, message: 'No items in sale' });
    }
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    if (!normalizedPaymentMethod) {
      console.error('❌ Validation failed: Payment method is required');
      return res.status(400).json({ success: false, message: 'paymentMethod is required' });
    }
    
    // Validate payment method is one of the allowed values
    const validPaymentMethods = ['cash', 'upi', 'card'];
    if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
      console.error('❌ Validation failed: Invalid payment method:', paymentMethod);
      return res.status(400).json({ success: false, message: `Invalid payment method. Allowed values: ${validPaymentMethods.join(', ')}` });
    }

    // Validate items structure
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.medicineId) {
        console.error(`❌ Validation failed: Item ${i} missing medicineId`);
        return res.status(400).json({ success: false, message: `Item ${i}: medicineId is required` });
      }
      if (!item.quantity) {
        console.error(`❌ Validation failed: Item ${i} missing quantity`);
        return res.status(400).json({ success: false, message: `Item ${i}: quantity is required` });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        console.error(`❌ Validation failed: Item ${i} invalid quantity`);
        return res.status(400).json({ success: false, message: `Item ${i}: quantity must be a positive number` });
      }
    }

    let subtotal = 0;
    let totalCost = 0;
    let totalItemsSold = 0;
    const saleItems = [];
    const ledgerEntries = [];

    // 1. Build sale items and ledger movements based on FEFO batches
      for (const item of items) {
        if (!item.medicineId || !item.quantity) {
          throw new Error('Each item must include medicineId and quantity');
        }

        const quantityRequested = Number(item.quantity);
        if (!Number.isFinite(quantityRequested) || quantityRequested <= 0) {
          throw new Error('Item quantity must be a positive number');
        }

        const batches = await Batch.find({
          medicineId: item.medicineId,
        })
          .sort({ expiryDate: 1, createdAt: 1 })
          .lean();

        if (!batches || batches.length === 0) {
          throw new Error('No batches found for one or more items');
        }

        const batchIds = batches.map((b) => b._id);

        const ledgerBalances = await StockLedger.aggregate([
          {
            $match: {
              medicineId: new mongoose.Types.ObjectId(item.medicineId),
              batchId: { $in: batchIds },
            },
          },
          {
            $group: {
              _id: '$batchId',
              quantity: { $sum: '$quantity' },
            },
          },
        ]);

        const balanceMap = new Map(
          ledgerBalances.map((l) => [l._id.toString(), l.quantity || 0]),
        );

        const totalAvailable = batches.reduce(
          (sum, b) => sum + (balanceMap.get(b._id.toString()) || 0),
          0,
        );
        if (totalAvailable < quantityRequested) {
          throw new Error('Insufficient stock for one or more items');
        }

        let remaining = quantityRequested;
        for (const batch of batches) {
          if (remaining <= 0) break;

          const key = batch._id.toString();
          const available = balanceMap.get(key) || 0;
          if (available <= 0) continue;

          const deduct = Math.min(available, remaining);
          const previousStock = available;
          const newStock = previousStock - deduct;
          balanceMap.set(key, newStock);

          const unitPrice = batch.mrp || batch.purchasePrice || 0;
          const unitCost = batch.purchasePrice || 0;
          const lineTotal = deduct * unitPrice;

          subtotal += lineTotal;
          totalCost += deduct * unitCost;
          totalItemsSold += deduct;

          saleItems.push({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchId: batch._id,
            quantity: deduct,
            unitPrice,
            lineTotal,
          });

          ledgerEntries.push({
            medicineId: item.medicineId,
            batchId: batch._id,
            quantity: -deduct,
            previousStock,
            newStock,
            unitCost,
            sellingPrice: unitPrice,
          });

          remaining -= deduct;
        }
      }

      // 2. Persist sale, sale items, stock movements and summary
      const total = subtotal + taxAmount - discountAmount;
      const profit = subtotal - totalCost - discountAmount;
      
      // Generate invoice number JUST before saving to prevent duplicate counter increments
      // Retry up to 3 times with counter-based approach, then fall back to timestamp-based
      let sale;
      let invoiceNumber;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          invoiceNumber = await generateInvoiceNumber();
          console.log(`📝 Generated invoice number: ${invoiceNumber} (attempt ${retries + 1})`);
          
          const [createdSale] = await Sale.create([
            {
              invoiceNumber,
              customerId: customerId || null,
              customerName: customerName || '',
              items: saleItems,
              subtotal,
              taxAmount,
              discountAmount,
              total,
              paymentMethod: normalizedPaymentMethod,
              paymentStatus: 'paid',
              userId: req.user?.id || null,
            },
          ]);
          
          sale = createdSale;
          console.log(`✅ Sale created successfully with ID: ${sale._id}, Invoice: ${invoiceNumber}`);
          break; // Success, exit retry loop
        } catch (error) {
          // Log full error details for debugging
          console.error(`❌ Error on attempt ${retries + 1}:`, {
            code: error.code,
            name: error.name,
            message: error.message,
            keyPattern: error.keyPattern,
            fullError: error.toString(),
          });
          
          // Check if this is a duplicate key error (multiple error format checks)
          const isDuplicateKeyError = 
            error.code === 11000 || 
            error.name === 'MongoServerError' ||
            error.message?.includes('duplicate key') ||
            error.message?.includes('E11000') ||
            (error.keyPattern && Object.keys(error.keyPattern).includes('invoiceNumber'));
            
          if (isDuplicateKeyError && retries < maxRetries - 1) {
            retries++;
            console.warn(`⚠️  Duplicate invoice number detected, retrying... (attempt ${retries + 1}/${maxRetries})`);
            continue; // Retry the loop
          }
          
          // Last attempt failed with duplicate key error - use fallback
          if (isDuplicateKeyError && retries === maxRetries - 1) {
            retries++;
            console.warn(`⚠️  Counter-based invoice failed on final attempt, using fallback timestamp-based generator...`);
            invoiceNumber = generateFallbackInvoiceNumber();
            console.log(`📝 Generated fallback invoice number: ${invoiceNumber}`);
            try {
              const [createdSale] = await Sale.create([
                {
                  invoiceNumber,
                  customerId: customerId || null,
                  customerName: customerName || '',
                  items: saleItems,
                  subtotal,
                  taxAmount,
                  discountAmount,
                  total,
                  paymentMethod: normalizedPaymentMethod,
                  paymentStatus: 'paid',
                  userId: req.user?.id || null,
                },
              ]);
              sale = createdSale;
              console.log(`✅ Sale created with fallback invoice: ${invoiceNumber}`);
              break;
            } catch (fallbackError) {
              console.error(`❌ Fallback invoice generation also failed:`, fallbackError.message);
              throw new Error(`Failed to create sale after all attempts. ${fallbackError.message}`);
            }
          }
          
          // Not a duplicate key error, throw immediately
          throw error;
        }
      }

      if (!sale) {
        throw new Error('Failed to create sale after multiple attempts');
      }

      await SaleItem.insertMany(
        saleItems.map((it) => ({
          ...it,
          saleId: sale._id,
        })),
      );

      if (ledgerEntries.length > 0) {
        await Promise.all(
          ledgerEntries.map((entry) =>
            StockLedger.recordMovement({
              medicineId: entry.medicineId,
              batchId: entry.batchId,
              type: 'SALE',
              quantity: entry.quantity,
              previousStock: entry.previousStock,
              newStock: entry.newStock,
              referenceType: 'invoice',
              referenceId: sale._id,
              reason: `Sale - ${invoiceNumber}`,
              // Cost basis for COGS/profit
              unitPrice: entry.unitCost,
              purchasePrice: entry.unitCost,
              // Selling price needed for revenue analytics
              sellingPrice: entry.sellingPrice,
              totalValue: Math.abs(entry.quantity) * entry.unitCost,
              userId: req.user?.id || null,
            }),
          ),
        );
      }

      const dateString = toLocalDateString();
      await DailySalesSummary.findOneAndUpdate(
        { date: dateString },
        {
          $inc: {
            totalSales: total,
            totalRevenue: total,
            profit,
            billCount: 1,
            itemsSold: totalItemsSold,
            totalTransactions: 1,
            totalItems: totalItemsSold,
          },
        },
        { upsert: true, new: true },
      );

      // Update customer totals if customerId is provided
      if (customerId) {
        await Customer.findByIdAndUpdate(
          customerId,
          {
            $inc: {
              totalSpent: total,
              totalVisits: 1,
            },
            $set: {
              lastVisit: new Date(),
            },
          },
          { new: true },
        );
      }

      res.status(201).json({
        success: true,
        message: 'Sale completed successfully',
        data: {
          invoiceNumber,
          total,
          items: saleItems.length,
          billCount: totalItemsSold,
        },
      });
  } catch (error) {
    console.error('❌ Sale creation error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create sale' });
    }
};

export const getTodaySummary = async (req, res) => {
  try {
    const dateString = toLocalDateString();

    const summary = await DailySalesSummary.findOne({ date: dateString }).lean();

    if (!summary) {
      return res.json({
        success: true,
        data: {
          totalSales: 0,
          totalRevenue: 0,
          billCount: 0,
          itemsSold: 0,
          profit: 0,
          date: dateString,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        totalSales: summary.totalSales || 0,
        totalRevenue: summary.totalRevenue || summary.totalSales || 0,
        billCount: summary.billCount || 0,
        itemsSold: summary.itemsSold || 0,
        profit: summary.profit || 0,
        date: summary.date,
        updatedAt: summary.updatedAt?.toISOString?.() || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Today summary error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch today summary' });
  }
};

export const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Sale.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: sales || [],
      pagination: {
        total: total || 0,
        page: pageNum,
        pages: Math.ceil((total || 0) / limitNum) || 0,
      },
    });
  } catch (error) {
    console.error('❌ Get sales error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch sales' });
  }
};

export const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by MongoDB ObjectId first, then by invoice number
    let sale;
    if (mongoose.Types.ObjectId.isValid(id)) {
      sale = await Sale.findById(id).lean();
    }
    
    // If not found by ID or invalid ObjectId, try by invoice number
    if (!sale) {
      sale = await Sale.findOne({ invoiceNumber: id }).lean();
    }
    
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const items = await SaleItem.find({ saleId: sale._id }).lean();

    res.json({
      success: true,
      data: {
        ...sale,
        items,
      },
    });
  } catch (error) {
    console.error('❌ Get sale error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch sale' });
  }
};
