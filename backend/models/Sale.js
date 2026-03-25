import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: String,
  items: [{
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    medicineName: String,
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true
    },
    lineTotal: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'paid'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerId: 1 });
// Additional indexes for analytics queries
saleSchema.index({ createdAt: -1, paymentMethod: 1 });
// Note: invoiceNumber already has a unique index from the field definition

export default mongoose.model('Sale', saleSchema);
