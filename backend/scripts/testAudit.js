import mongoose from 'mongoose';
import StockAudit from '../models/StockAudit.js';
import StockAuditItem from '../models/StockAuditItem.js';
import Medicine from '../models/Medicine.js';
import Batch from '../models/Batch.js';
import { checkTransactionSupport } from '../utils/mongoTransactions.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacy_system';

console.log('🔍 Testing Audit Setup...\n');

try {
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected\n');

  // Check transaction support
  console.log('📋 Checking MongoDB transaction support...');
  const transactionSupport = await checkTransactionSupport();
  console.log(`   Transaction support: ${transactionSupport ? '✅ YES (Replica Set/Sharded)' : '❌ NO (Standalone)'}
   This is expected for local development\n`);

  // Check if StockAudit collection exists
  console.log('📊 Checking collections...');
  const collections = await mongoose.connection.db.listCollections().toArray();
  const hasStockAudit = collections.some(c => c.name === 'stockaudits');
  const hasStockAuditItem = collections.some(c => c.name === 'stockaudititems');
  console.log(`   StockAudit collection: ${hasStockAudit ? '✅ YES' : '❌ NO'}`);
  console.log(`   StockAuditItem collection: ${hasStockAuditItem ? '✅ YES' : '❌ NO'}\n`);

  // Count existing audits
  console.log('📈 Audit Records Summary:');
  const completedCount = await StockAudit.countDocuments({ status: 'completed' });
  const inProgressCount = await StockAudit.countDocuments({ status: 'in_progress' });
  const cancelledCount = await StockAudit.countDocuments({ status: 'cancelled' });
  
  console.log(`   Completed audits: ${completedCount}`);
  console.log(`   In-progress audits: ${inProgressCount}`);
  console.log(`   Cancelled audits: ${cancelledCount}`);
  console.log(`   Total audits: ${completedCount + inProgressCount + cancelledCount}\n`);

  // Check if we have medicines to audit
  console.log('📦 Checking data for audit:');
  const medicineCount = await Medicine.countDocuments({ discontinued: { $ne: true } });
  const batchCount = await Batch.countDocuments();
  console.log(`   Active medicines: ${medicineCount}`);
  console.log(`   Batches: ${batchCount}\n`);

  if (medicineCount === 0) {
    console.log('⚠️  WARNING: No medicines available for audit!');
    console.log('   Run the medicine import script first: node scripts/cleanAndImport.js\n');
  }

  if (completedCount === 0) {
    console.log('✨ Status: No audits completed yet (normal for new system)');
    console.log('   You can start an audit using the admin panel\n');
  } else {
    const lastAudit = await StockAudit.findOne({ status: 'completed' }).sort({ completedAt: -1 });
    console.log(`✅ Last completed audit: ${lastAudit.completedAt.toISOString()}`);
    console.log(`   Type: ${lastAudit.type}, Items: ${lastAudit.itemsAudited}, Mismatches: ${lastAudit.mismatches}\n`);
  }

  // Test Audit Model
  console.log('🧪 Testing StockAudit Model:');
  try {
    const testAudit = new StockAudit({
      type: 'full',
      status: 'in_progress',
      performedBy: 'test',
      startedAt: new Date()
    });
    console.log('   Model creation: ✅ OK');
    console.log(`   Audit schema fields: ${Object.keys(testAudit.schema.paths).join(', ')}\n`);
  } catch (error) {
    console.log(`   Model creation: ❌ ERROR - ${error.message}\n`);
  }

  console.log('✅ All checks completed!');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error);
} finally {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
  process.exit(0);
}
