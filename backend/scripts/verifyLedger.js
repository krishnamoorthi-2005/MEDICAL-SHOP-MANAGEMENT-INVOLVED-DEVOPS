import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI;

async function verify() {
  try {
    const conn = await mongoose.connect(uri);
    const db = conn.connection.db;
    
    const medicines = await db.collection('medicines').countDocuments();
    const batches = await db.collection('batches').countDocuments();
    const ledgers = await db.collection('stockledgers').countDocuments();
    
    console.log(`
✅ Database Verification:
   Medicines: ${medicines}
   Batches: ${batches}
   StockLedger entries: ${ledgers}
    `);
    
    const sample = await db.collection('stockledgers').findOne({});
    console.log('Sample ledger entry:');
    console.log(JSON.stringify(sample, null, 2));
    
    await conn.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

verify();
