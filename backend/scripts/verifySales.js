import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI;

async function verifyData() {
  try {
    const conn = await mongoose.connect(uri);
    const db = conn.connection.db;
    
    const salesCount = await db.collection('sales').countDocuments();
    const ledgerSalesCount = await db.collection('stockledgers').countDocuments({ type: 'SALE' });
    const dailySummaryCount = await db.collection('dailyssallessummaries').countDocuments();
    
    const sale = await db.collection('sales').findOne({});
    const dailySummary = await db.collection('dailyssallessummaries').findOne({});
    
    console.log(`
✅ Data Verification:
   Sales: ${salesCount}
   Stock Ledger (SALE type): ${ledgerSalesCount}
   Daily Summaries: ${dailySummaryCount}

📊 Sample Sale:
${JSON.stringify(sale, null, 2)}

📅 Sample Daily Summary:
${JSON.stringify(dailySummary, null, 2)}
    `);
    
    await conn.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

verifyData();
