import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

async function importAll() {
  let conn, db, supplier, mfg;
  try {
    console.log('🔄 Connecting...');
    conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    db = conn.connection.db;
    console.log('✅ Connected\n');

    // Get or create supplier and manufacturer
    supplier = await db.collection('suppliers').findOne({ name: 'Default Supplier' });
    if (!supplier) {
      const result = await db.collection('suppliers').insertOne({
        name: 'Default Supplier',
        phone: '+91-0000000000',
        email: 'supplier@pharmacy.local',
        address: 'Default Supplier',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      supplier = { _id: result.insertedId, name: 'Default Supplier' };
    }

    mfg = await db.collection('manufacturers').findOne({ name: 'Generic Manufacturer' });
    if (!mfg) {
      const result = await db.collection('manufacturers').insertOne({
        name: 'Generic Manufacturer',
        email: 'mfg@pharmacy.local',
        address: 'Manufacturer',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      mfg = { _id: result.insertedId, name: 'Generic Manufacturer' };
    }

    let success = 0, failed = 0;
    const genericsCache = {};

    for (let i = 0; i < medicineData.length; i++) {
      const med = medicineData[i];
      try {
        // Get generic
        const genericName = med.name.split(' ')[0];
        let generic = genericsCache[genericName];
        if (!generic) {
          generic = await db.collection('generics').findOne({ name: genericName });
          if (!generic) {
            const gRes = await db.collection('generics').insertOne({
              name: genericName,
              therapeuticClass: med.category,
              commonUses: `${med.category} medicine`,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            generic = { _id: gRes.insertedId };
          }
          genericsCache[genericName] = generic;
        }

        // Get/create medicine
        let medicine = await db.collection('medicines').findOne({ name: med.name });
        if (!medicine) {
          const minMax = med.minMax.split('/');
          const mRes = await db.collection('medicines').insertOne({
            name: med.name,
            genericId: generic._id,
            manufacturerId: mfg._id,
            category: med.category,
            unitType: ['Tablet', 'Supplement', 'Powder'].includes(med.category) ? 'tablet' : 
                     med.category === 'Capsule' ? 'capsule' :
                     med.category === 'Syrup' ? 'syrup' : 
                     med.category === 'Injection' ? 'injection' : 'tablet',
            rackLocation: med.rack,
            minStockLevel: parseInt(minMax[0]),
            maxStockLevel: parseInt(minMax[1]),
            gstRate: 12,
            discontinued: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          medicine = { _id: mRes.insertedId };
        }

        // Create batch
        const batchNumber = `B${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const batchRes = await db.collection('batches').insertOne({
          medicineId: medicine._id,
          batchNumber: batchNumber,
          expiryDate: new Date(med.expiryDate),
          purchasePrice: med.purchasePrice,
          mrp: med.sellingPrice,
          quantityAvailable: med.stockQty,
          supplierId: supplier._id,
          receivedDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Create ledger
        await db.collection('stockledgers').insertOne({
          medicineId: medicine._id,
          medicineName: med.name,
          batchId: batchRes.insertedId,
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
          reason: 'Initial stock import',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`[${i+1}/${medicineData.length}] ✅ ${med.name} (${med.stockQty} units)`);
        success++;
      } catch (error) {
        console.log(`[${i+1}/${medicineData.length}] ❌ ${med.name}: ${error.message.substring(0, 60)}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ IMPORT COMPLETE');
    console.log(`✅ Success: ${success} | ❌ Failed: ${failed}`);
    console.log('='.repeat(70));

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (conn) await mongoose.disconnect();
    process.exit(1);
  }
}

importAll();
