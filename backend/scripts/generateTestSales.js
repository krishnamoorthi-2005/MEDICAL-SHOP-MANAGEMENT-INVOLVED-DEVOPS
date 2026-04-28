import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Sale from '../models/Sale.js';
import Batch from '../models/Batch.js';
import Medicine from '../models/Medicine.js';
import StockLedger from '../models/StockLedger.js';
import DailySalesSummary from '../models/DailySalesSummary.js';

const uri = process.env.MONGO_URI;

async function generateTestSales() {
  try {
    const conn = await mongoose.connect(uri);
    console.log('✅ Connected to database\n');
    
    // Clean up existing test sales
    await Sale.deleteMany({});
    await StockLedger.deleteMany({ type: 'SALE' });
    await DailySalesSummary.deleteMany({});
    console.log('🧹 Cleaned up existing sales\n');
    
    const medicines = await Medicine.find({}).lean();
    console.log(`📦 Found ${medicines.length} medicines\n`);
    
    if (medicines.length === 0) {
      console.error('❌ No medicines found. Please import medicines first.');
      await conn.disconnect();
      return;
    }

    // Generate sales for last 7 days
    const paymentMethods = ['cash', 'upi', 'card'];
    const salesPerDay = 10;
    
    console.log(`📈 Generating ${salesPerDay * 7} test sales...\n`);

    let successCount = 0;
    let counter = 1000;

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - dayOffset);

      const dateStr = dayDate.toISOString().split('T')[0];
      console.log(`📅 ${dateStr}:`);

      for (let saleIdx = 0; saleIdx < salesPerDay; saleIdx++) {
        try {
          const saleTime = new Date(dayDate);
          saleTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

          // Pick 1-3 medicines
          const numItems = Math.floor(Math.random() * 3) + 1;
          const saleItems = [];
          let subtotal = 0;
          let totalCost = 0;
          let totalItemsSold = 0;

          for (let i = 0; i < numItems; i++) {
            const med = medicines[Math.floor(Math.random() * medicines.length)];
            const batches = await Batch.find({ medicineId: med._id }).sort({ expiryDate: 1 }).lean();
            
            if (batches.length === 0) continue;

            const batch = batches[0];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const unitPrice = batch.mrp || 50;
            const unitCost = batch.purchasePrice || 25;
            const lineTotal = quantity * unitPrice;

            saleItems.push({
              medicineId: med._id,
              medicineName: med.name,
              batchId: batch._id,
              quantity,
              unitPrice,
              lineTotal,
            });

            subtotal += lineTotal;
            totalCost += quantity * unitCost;
            totalItemsSold += quantity;
          }

          if (saleItems.length === 0) continue;

          const taxAmount = Math.floor(subtotal * 0.05);
          const discountAmount = Math.floor(Math.random() * 50);
          const total = subtotal + taxAmount - discountAmount;
          const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          const invoiceNumber = `INV-${Date.now()}-${counter++}`;

          const sale = await Sale.create({
            invoiceNumber,
            customerName: `Cust ${counter}`,
            customerId: null,
            items: saleItems,
            subtotal,
            taxAmount,
            discountAmount,
            total,
            paymentMethod,
            paymentStatus: 'paid',
            createdAt: saleTime,
            updatedAt: saleTime,
          });

          // Create stock ledger entries
          for (const item of saleItems) {
            const batch = await Batch.findById(item.batchId).lean();
            await StockLedger.create({
              medicineId: item.medicineId,
              batchId: item.batchId,
              type: 'SALE',
              quantity: -item.quantity,
              purchasePrice: batch.purchasePrice,
              sellingPrice: item.unitPrice,
              referenceType: 'invoice',
              referenceId: sale._id,
              reason: `Sale - ${invoiceNumber}`,
              createdAt: saleTime,
              updatedAt: saleTime,
            });
          }

          // Update daily summary
          const summaryDate = saleTime.toISOString().split('T')[0];
          await DailySalesSummary.findOneAndUpdate(
            { date: summaryDate },
            {
              $inc: {
                totalSales: total,
                totalRevenue: total,
                profit: subtotal - totalCost,
                billCount: 1,
                itemsSold: totalItemsSold,
              },
            },
            { upsert: true, new: true }
          );

          successCount++;
          process.stdout.write('.');
        } catch (err) {
          console.error(`\n❌ ${err.message}`);
        }
      }
      console.log(' ✓');
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ Test Sales Generated! Total: ${successCount} sales`);
    console.log(`${'='.repeat(70)}\n`);

    await conn.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

generateTestSales();
