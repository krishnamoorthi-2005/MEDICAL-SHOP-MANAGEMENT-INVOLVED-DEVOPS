import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    const db = conn.connection.db;  
    
    const sales = await db.collection('sales').countDocuments();
    const ledgers = await db.collection('stockledgers').countDocuments();
    
    console.log('✅ Database Connected');
    console.log('Sales:', sales);
    console.log('Stock Ledger entries:', ledgers);
    
    if (sales > 0) {
      const sample = await db.collection('sales').findOne({});
      console.log('\nSample Sale:', sample.invoiceNumber, '- Total: ₹' + sample.total);
    }
    
    await conn.disconnect();
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}
test();
