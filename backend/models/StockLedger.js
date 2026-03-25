import mongoose from 'mongoose';

// Central stock ledger: every stock change must write here
const stockLedgerSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicineName: {
      type: String,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Core movement types
        'PURCHASE',
        'SALE',
        'EXPIRED_WRITE_OFF',
        'EXPIRED',
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_REMOVE',
        // Backwards-compatible legacy values already used in code/data
        'PURCHASE_IN',
        'SALE_OUT',
        'AUDIT_ADJUSTMENT',
        'DAMAGE_WRITE_OFF',
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true, // Positive for inflow, negative for outflow
    },
    batchNumber: {
      type: String,
    },
    expiryDate: {
      type: Date,
    },
    referenceType: {
      type: String,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    reason: {
      type: String,
    },
    previousStock: {
      type: Number,
    },
    newStock: {
      type: Number,
    },
    // Cost price per unit (typically purchase price or cost basis)
    unitPrice: {
      type: Number,
      default: 0,
    },
    // Explicit purchase and selling prices to support ledger-only analytics
    purchasePrice: {
      type: Number,
    },
    sellingPrice: {
      type: Number,
    },
    // Monetary value for the movement (e.g. abs(quantity) * unitPrice)
    totalValue: {
      type: Number,
      default: 0,
    },
    // Explicit loss amount for write-offs (mainly expired)
    totalLoss: {
      type: Number,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Guardrail validation to prevent invalid ledger entries
// Use thrown errors instead of the legacy `next` callback to
// avoid "next is not a function" issues with newer Mongoose versions.
stockLedgerSchema.pre('validate', function () {
  const doc = this;

  if (!doc.medicineId || !doc.batchId) {
    throw new Error('Ledger entry requires medicineId and batchId');
  }

  if (doc.type === 'SALE') {
    if (doc.quantity == null || doc.quantity >= 0) {
      throw new Error('SALE quantity must be negative');
    }
    if (doc.purchasePrice == null) {
      throw new Error('SALE must include purchasePrice');
    }
    if (doc.sellingPrice == null) {
      throw new Error('SALE must include sellingPrice');
    }
  }

  if (doc.type === 'PURCHASE') {
    if (doc.quantity == null || doc.quantity <= 0) {
      throw new Error('PURCHASE quantity must be positive');
    }
    if (doc.purchasePrice == null) {
      throw new Error('PURCHASE must include purchasePrice');
    }
  }

  if (doc.type === 'EXPIRED' || doc.type === 'EXPIRED_WRITE_OFF') {
    if (doc.purchasePrice == null && doc.unitPrice == null) {
      throw new Error('EXPIRED entries must include purchasePrice or unitPrice');
    }
  }
});

// Centralized ledger writer to enforce invariants on all new movements
stockLedgerSchema.statics.recordMovement = async function recordMovement(data) {
  if (!data) {
    throw new Error('Ledger data is required');
  }

  if (!data.medicineId) {
    throw new Error('medicineId required');
  }

  if (!data.batchId) {
    throw new Error('batchId required');
  }

  if (data.type === 'SALE' && (data.quantity == null || data.quantity >= 0)) {
    throw new Error('SALE quantity must be negative');
  }

  if (data.type === 'PURCHASE' && (data.quantity == null || data.quantity <= 0)) {
    throw new Error('PURCHASE quantity must be positive');
  }

  if (
    (data.type === 'EXPIRED' || data.type === 'EXPIRED_WRITE_OFF') &&
    data.purchasePrice == null &&
    data.unitPrice == null
  ) {
    throw new Error('EXPIRED entries must include purchasePrice or unitPrice');
  }

  const payload = { ...data };

  if (payload.purchasePrice == null && payload.unitPrice != null) {
    payload.purchasePrice = payload.unitPrice;
  }

  if (payload.unitPrice == null && payload.purchasePrice != null) {
    payload.unitPrice = payload.purchasePrice;
  }

  if (payload.totalValue == null && payload.quantity != null && payload.unitPrice != null) {
    payload.totalValue = Math.abs(payload.quantity) * payload.unitPrice;
  }

  return this.create(payload);
};

stockLedgerSchema.index({ medicineId: 1, batchId: 1, createdAt: -1 });
stockLedgerSchema.index({ type: 1, createdAt: -1 });
// Additional indexes for high-concurrency aggregation queries
stockLedgerSchema.index({ medicineId: 1, createdAt: -1 });
stockLedgerSchema.index({ batchId: 1, type: 1 });
stockLedgerSchema.index({ type: 1, medicineId: 1, createdAt: -1 });

export default mongoose.model('StockLedger', stockLedgerSchema, 'stockledgers');
