import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Medicine from '../models/Medicine.js';
import Generic from '../models/Generic.js';
import Manufacturer from '../models/Manufacturer.js';
import Supplier from '../models/Supplier.js';
import Batch from '../models/Batch.js';
import StockLedger from '../models/StockLedger.js';
import connectDB from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const medicineData = [
  { name: 'Paracetamol 500mg', category: 'Tablet', stockQty: 250, expiryDate: '2026-04-02', rack: 'R1-S5', minMax: '80/400', purchasePrice: 12.50, sellingPrice: 18.00 },
  { name: 'Ibuprofen 400mg', category: 'Tablet', stockQty: 300, expiryDate: '2026-04-05', rack: 'R2-S3', minMax: '70/350', purchasePrice: 15.00, sellingPrice: 22.00 },
  { name: 'Amoxicillin 250mg', category: 'Capsule', stockQty: 180, expiryDate: '2026-04-01', rack: 'R3-S7', minMax: '60/300', purchasePrice: 25.00, sellingPrice: 36.00 },
  { name: 'Azithromycin 500mg', category: 'Tablet', stockQty: 150, expiryDate: '2026-04-03', rack: 'R4-S2', minMax: '50/250', purchasePrice: 45.00, sellingPrice: 65.00 },
  { name: 'Cetirizine 10mg', category: 'Tablet', stockQty: 220, expiryDate: '2026-04-04', rack: 'R2-S6', minMax: '75/320', purchasePrice: 10.00, sellingPrice: 15.00 },
  { name: 'Metformin 500mg', category: 'Tablet', stockQty: 400, expiryDate: '2026-05-20', rack: 'R5-S1', minMax: '90/500', purchasePrice: 20.00, sellingPrice: 30.00 },
  { name: 'Aspirin 75mg', category: 'Tablet', stockQty: 350, expiryDate: '2026-05-25', rack: 'R1-S9', minMax: '85/450', purchasePrice: 8.00, sellingPrice: 12.00 },
  { name: 'Pantoprazole 40mg', category: 'Tablet', stockQty: 200, expiryDate: '2026-06-10', rack: 'R3-S4', minMax: '60/300', purchasePrice: 30.00, sellingPrice: 45.00 },
  { name: 'Vitamin D3', category: 'Supplement', stockQty: 180, expiryDate: '2026-06-15', rack: 'R6-S2', minMax: '70/280', purchasePrice: 50.00, sellingPrice: 75.00 },
  { name: 'Calcium Tablets', category: 'Supplement', stockQty: 210, expiryDate: '2026-07-01', rack: 'R7-S3', minMax: '80/300', purchasePrice: 40.00, sellingPrice: 60.00 },
  { name: 'ORS Sachet', category: 'Powder', stockQty: 500, expiryDate: '2026-04-02', rack: 'R8-S1', minMax: '100/600', purchasePrice: 5.00, sellingPrice: 10.00 },
  { name: 'Insulin Injection', category: 'Injection', stockQty: 120, expiryDate: '2026-04-06', rack: 'R9-S5', minMax: '50/200', purchasePrice: 150.00, sellingPrice: 220.00 },
  { name: 'Cough Syrup', category: 'Syrup', stockQty: 170, expiryDate: '2026-05-10', rack: 'R4-S8', minMax: '60/250', purchasePrice: 65.00, sellingPrice: 95.00 },
  { name: 'Antacid Suspension', category: 'Syrup', stockQty: 200, expiryDate: '2026-05-15', rack: 'R2-S10', minMax: '70/300', purchasePrice: 55.00, sellingPrice: 80.00 },
  { name: 'Multivitamin Capsules', category: 'Capsule', stockQty: 260, expiryDate: '2026-06-20', rack: 'R5-S6', minMax: '90/400', purchasePrice: 70.00, sellingPrice: 110.00 },
  { name: 'Zinc Tablets', category: 'Tablet', stockQty: 240, expiryDate: '2026-06-25', rack: 'R6-S9', minMax: '80/350', purchasePrice: 20.00, sellingPrice: 30.00 },
  { name: 'Iron Tablets', category: 'Tablet', stockQty: 190, expiryDate: '2026-07-05', rack: 'R7-S7', minMax: '70/300', purchasePrice: 18.00, sellingPrice: 28.00 },
  { name: 'Folic Acid', category: 'Tablet', stockQty: 210, expiryDate: '2026-07-10', rack: 'R1-S11', minMax: '75/320', purchasePrice: 12.00, sellingPrice: 18.00 },
  { name: 'Saline IV', category: 'Injection', stockQty: 140, expiryDate: '2026-04-08', rack: 'R3-S12', minMax: '50/200', purchasePrice: 35.00, sellingPrice: 55.00 },
  { name: 'Glucose IV', category: 'Injection', stockQty: 160, expiryDate: '2026-04-09', rack: 'R4-S11', minMax: '60/220', purchasePrice: 40.00, sellingPrice: 60.00 },
  { name: 'Dolo 650', category: 'Tablet', stockQty: 300, expiryDate: '2026-05-18', rack: 'R5-S8', minMax: '80/400', purchasePrice: 20.00, sellingPrice: 32.00 },
  { name: 'Crocin Tablets', category: 'Tablet', stockQty: 280, expiryDate: '2026-06-05', rack: 'R6-S4', minMax: '75/380', purchasePrice: 18.00, sellingPrice: 28.00 },
  { name: 'Benadryl Syrup', category: 'Syrup', stockQty: 150, expiryDate: '2026-05-22', rack: 'R2-S12', minMax: '60/250', purchasePrice: 75.00, sellingPrice: 110.00 },
  { name: 'Augmentin 625', category: 'Tablet', stockQty: 130, expiryDate: '2026-06-30', rack: 'R7-S2', minMax: '50/200', purchasePrice: 95.00, sellingPrice: 140.00 },
  { name: 'Gelusil Tablets', category: 'Tablet', stockQty: 220, expiryDate: '2026-07-15', rack: 'R3-S15', minMax: '80/300', purchasePrice: 25.00, sellingPrice: 40.00 },
  { name: 'Thyronorm 50mcg', category: 'Tablet', stockQty: 110, expiryDate: '2026-08-01', rack: 'R8-S4', minMax: '50/180', purchasePrice: 60.00, sellingPrice: 90.00 },
  { name: 'Shelcal 500', category: 'Tablet', stockQty: 210, expiryDate: '2026-08-10', rack: 'R9-S3', minMax: '70/300', purchasePrice: 55.00, sellingPrice: 85.00 },
  { name: 'Limcee Vitamin C', category: 'Tablet', stockQty: 250, expiryDate: '2026-09-01', rack: 'R1-S14', minMax: '90/350', purchasePrice: 30.00, sellingPrice: 45.00 },
  { name: 'Ecosprin 75', category: 'Tablet', stockQty: 270, expiryDate: '2026-09-10', rack: 'R2-S15', minMax: '85/360', purchasePrice: 12.00, sellingPrice: 20.00 },
  { name: 'Pan D Capsule', category: 'Capsule', stockQty: 200, expiryDate: '2026-10-01', rack: 'R3-S16', minMax: '70/300', purchasePrice: 65.00, sellingPrice: 95.00 },
  { name: 'Omez 20', category: 'Capsule', stockQty: 180, expiryDate: '2026-10-05', rack: 'R4-S13', minMax: '60/250', purchasePrice: 55.00, sellingPrice: 80.00 },
  { name: 'Atorvastatin 10mg', category: 'Tablet', stockQty: 160, expiryDate: '2026-11-01', rack: 'R5-S10', minMax: '60/240', purchasePrice: 75.00, sellingPrice: 110.00 },
  { name: 'Telma 40', category: 'Tablet', stockQty: 170, expiryDate: '2026-11-15', rack: 'R6-S12', minMax: '65/260', purchasePrice: 85.00, sellingPrice: 125.00 },
  { name: 'Amlodipine 5mg', category: 'Tablet', stockQty: 220, expiryDate: '2026-12-01', rack: 'R7-S10', minMax: '80/320', purchasePrice: 20.00, sellingPrice: 30.00 },
  { name: 'Losartan 50mg', category: 'Tablet', stockQty: 210, expiryDate: '2026-12-10', rack: 'R8-S9', minMax: '75/300', purchasePrice: 35.00, sellingPrice: 50.00 },
  { name: 'Glycomet 500', category: 'Tablet', stockQty: 260, expiryDate: '2027-01-05', rack: 'R9-S8', minMax: '90/400', purchasePrice: 25.00, sellingPrice: 38.00 },
  { name: 'Glimipride 1mg', category: 'Tablet', stockQty: 230, expiryDate: '2027-01-15', rack: 'R1-S18', minMax: '85/350', purchasePrice: 30.00, sellingPrice: 45.00 }
];

function getCategoryUnitType(category) {
  const mapping = {
    'Tablet': 'tablet',
    'Capsule': 'capsule',
    'Syrup': 'syrup',
    'Injection': 'injection',
    'Supplement': 'tablet',
    'Powder': 'tablet'
  };
  return mapping[category] || 'tablet';
}

function getGenericName(medicineName) {
  const parts = medicineName.split(' ');
  return parts[0];
}

function parseMinMax(minMaxStr) {
  const [min, max] = minMaxStr.split('/').map(Number);
  return { min: min || 0, max: max || 0 };
}

async function importMedicine(med, supplier, manufacturer) {
  try {
    const genericName = getGenericName(med.name);
    let generic = await Generic.findOne({ name: genericName });
    if (!generic) {
      generic = await Generic.create({
        name: genericName,
        therapeuticClass: med.category,
        commonUses: `${med.category} medicine`
      });
    }

    const unitType = getCategoryUnitType(med.category);
    const { min, max } = parseMinMax(med.minMax);

    let medicine = await Medicine.findOne({ name: med.name });
    if (!medicine) {
      medicine = await Medicine.create({
        name: med.name,
        genericId: generic._id,
        manufacturerId: manufacturer._id,
        category: med.category,
        unitType: unitType,
        rackLocation: med.rack,
        minStockLevel: min,
        maxStockLevel: max,
        gstRate: 12,
        discontinued: false
      });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const batchNumber = `B${timestamp}-${randomId}`;
    
    const batch = await Batch.create({
      medicineId: medicine._id,
      batchNumber: batchNumber,
      expiryDate: new Date(med.expiryDate),
      purchasePrice: med.purchasePrice,
      mrp: med.sellingPrice,
      quantityAvailable: med.stockQty,
      supplierId: supplier._id,
      receivedDate: new Date()
    });

    await StockLedger.create({
      medicineId: medicine._id,
      medicineName: med.name,
      batchId: batch._id,
      type: 'PURCHASE',
      quantity: med.stockQty,
      batchNumber: batchNumber,
      expiryDate: new Date(med.expiryDate),
      unitPrice: med.purchasePrice,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      totalValue: med.stockQty * med.purchasePrice,
      previousStock: 0,
      newStock: med.stockQty,
      reason: 'Initial stock import'
    });

    return { success: true, message: med.name };
  } catch (error) {
    throw new Error(`${med.name}: ${error.message}`);
  }
}

async function importBatch(batch, startIdx, supplier, manufacturer) {
  const results = [];
  
  for (const med of batch) {
    try {
      await importMedicine(med, supplier, manufacturer);
      results.push({ success: true, name: med.name });
    } catch (error) {
      results.push({ success: false, name: med.name, error: error.message });
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected\n');

    let supplier = await Supplier.findOne({ name: 'Default Supplier' });
    if (!supplier) {
      supplier = await Supplier.create({
        name: 'Default Supplier',
        phone: '+91-0000000000',
        email: 'supplier@pharmacy.local',
        address: 'Default Supplier Address',
        status: 'active'
      });
    }

    let manufacturer = await Manufacturer.findOne({ name: 'Generic Manufacturer' });
    if (!manufacturer) {
      manufacturer = await Manufacturer.create({
        name: 'Generic Manufacturer',
        email: 'mfg@pharmacy.local',
        address: 'Manufacturer Address',
        status: 'active'
      });
    }

    const BATCH_SIZE = 5;
    let totalSuccess = 0;
    let totalError = 0;

    console.log(`🔄 Importing ${medicineData.length} medicines in batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < medicineData.length; i += BATCH_SIZE) {
      const batchData = medicineData.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`📦 Batch ${batchNum}: Processing medicines ${i + 1}-${Math.min(i + BATCH_SIZE, medicineData.length)}...`);
      
      const results = await importBatch(batchData, i, supplier, manufacturer);
      
      results.forEach(result => {
        if (result.success) {
          console.log(`  ✅ ${result.name}`);
          totalSuccess++;
        } else {
          console.log(`  ❌ ${result.error}`);
          totalError++;
        }
      });
      
      console.log('');
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('='.repeat(70));
    console.log('✅ IMPORT COMPLETED');
    console.log('='.repeat(70));
    console.log(`✅ Successful: ${totalSuccess}/${medicineData.length}`);
    console.log(`❌ Failed: ${totalError}/${medicineData.length}`);
    console.log('='.repeat(70));

    await mongoose.disconnect();
    process.exit(totalError === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

main();
