import twilio from 'twilio';
import Medicine from '../models/Medicine.js';
import Batch from '../models/Batch.js';
import StockLedger from '../models/StockLedger.js';

const getClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials not configured');
  return twilio(sid, token);
};

// ─── Gather stock snapshot ────────────────────────────────────────────────────
export const getStockSnapshot = async () => {
  const medicines = await Medicine.find({ discontinued: { $ne: true } }).lean();
  if (medicines.length === 0) return null;

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const medicineIds = medicines.map(m => m._id);

  const [allBatches, ledgerBalances] = await Promise.all([
    Batch.find({ medicineId: { $in: medicineIds } }).lean(),
    StockLedger.aggregate([
      { $match: { medicineId: { $in: medicineIds } } },
      { $group: { _id: '$batchId', quantity: { $sum: '$quantity' } } },
    ]),
  ]);

  const balanceMap = new Map(ledgerBalances.map(l => [l._id.toString(), l.quantity || 0]));
  const batchesByMed = new Map();
  for (const b of allBatches) {
    const key = b.medicineId.toString();
    if (!batchesByMed.has(key)) batchesByMed.set(key, []);
    batchesByMed.get(key).push(b);
  }

  const healthy = [];
  const lowStock = [];
  const expiringSoon = [];
  const expired = [];

  for (const med of medicines) {
    const batches = batchesByMed.get(med._id.toString()) || [];
    const totalStock = batches.reduce((sum, b) => sum + (balanceMap.get(b._id.toString()) || 0), 0);
    const minLevel = med.minStockLevel || 0;

    // Expired batches with stock
    const expiredBatches = batches.filter(b => new Date(b.expiryDate) < now && (balanceMap.get(b._id.toString()) || 0) > 0);
    if (expiredBatches.length > 0) {
      const qty = expiredBatches.reduce((s, b) => s + (balanceMap.get(b._id.toString()) || 0), 0);
      expired.push({ name: med.name, qty, batches: expiredBatches.length });
      continue; // expired takes priority
    }

    // Expiring soon (within 30 days)
    const soonBatches = batches.filter(b => {
      const exp = new Date(b.expiryDate);
      return exp >= now && exp <= in30Days && (balanceMap.get(b._id.toString()) || 0) > 0;
    });
    if (soonBatches.length > 0) {
      const earliest = soonBatches.reduce((min, b) => new Date(b.expiryDate) < new Date(min.expiryDate) ? b : min, soonBatches[0]);
      const daysLeft = Math.ceil((new Date(earliest.expiryDate) - now) / (1000 * 60 * 60 * 24));
      expiringSoon.push({ name: med.name, qty: totalStock, daysLeft });
      continue;
    }

    // Low stock
    if (minLevel > 0 && totalStock < minLevel) {
      lowStock.push({ name: med.name, qty: totalStock, minLevel });
      continue;
    }

    // Healthy
    if (totalStock > 0) {
      healthy.push({ name: med.name, qty: totalStock });
    }
  }

  return { healthy, lowStock, expiringSoon, expired, total: medicines.length };
};

// ─── Format SMS message ───────────────────────────────────────────────────────
const formatSMS = (snapshot) => {
  const { healthy, lowStock, expiringSoon, expired, total } = snapshot;
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  let msg = `📦 PHARMACY STOCK REPORT\n${date}\nTotal: ${total} medicines\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;

  // Expired
  if (expired.length > 0) {
    msg += `\n🔴 EXPIRED (${expired.length})\n`;
    expired.forEach(i => {
      msg += `  • ${i.name}: ${i.qty} units (${i.batches} batch${i.batches > 1 ? 'es' : ''})\n`;
    });
  }

  // Low stock
  if (lowStock.length > 0) {
    msg += `\n🟠 LOW STOCK (${lowStock.length})\n`;
    lowStock.forEach(i => {
      msg += `  • ${i.name}: ${i.qty}/${i.minLevel} units\n`;
    });
  }

  // Expiring soon
  if (expiringSoon.length > 0) {
    msg += `\n🟡 EXPIRING SOON (${expiringSoon.length})\n`;
    expiringSoon.forEach(i => {
      msg += `  • ${i.name}: ${i.qty} units (${i.daysLeft}d left)\n`;
    });
  }

  // Healthy
  msg += `\n✅ HEALTHY STOCK (${healthy.length})\n`;
  if (healthy.length > 0) {
    healthy.forEach(i => {
      msg += `  • ${i.name}: ${i.qty} units\n`;
    });
  }

  // Summary line
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `✅ ${healthy.length} healthy  🟠 ${lowStock.length} low  🟡 ${expiringSoon.length} expiring  🔴 ${expired.length} expired`;

  return msg;
};

// ─── Send SMS ─────────────────────────────────────────────────────────────────
export const sendStockSMS = async () => {
  const to = process.env.TWILIO_TO_NUMBER;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!to || !from) throw new Error('TWILIO_TO_NUMBER and TWILIO_FROM_NUMBER must be set in .env');

  const snapshot = await getStockSnapshot();
  if (!snapshot) {
    console.log('📭 No medicines found, skipping SMS');
    return { skipped: true };
  }

  const body = formatSMS(snapshot);
  const client = getClient();

  const message = await client.messages.create({ body, from, to });
  console.log(`✅ Twilio SMS sent: ${message.sid}`);
  return { sid: message.sid, snapshot };
};

// ─── Send WhatsApp ────────────────────────────────────────────────────────────
export const sendStockWhatsApp = async () => {
  const to = `whatsapp:${process.env.TWILIO_TO_NUMBER}`;
  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER}`;

  if (!process.env.TWILIO_TO_NUMBER) throw new Error('TWILIO_TO_NUMBER must be set in .env');

  const snapshot = await getStockSnapshot();
  if (!snapshot) {
    console.log('📭 No medicines found, skipping WhatsApp');
    return { skipped: true };
  }

  const body = formatSMS(snapshot);
  const client = getClient();

  const message = await client.messages.create({ body, from, to });
  console.log(`✅ Twilio WhatsApp sent: ${message.sid}`);
  return { sid: message.sid, snapshot };
};
