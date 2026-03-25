import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  genericId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Generic',
    required: true
  },
  manufacturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manufacturer',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  unitType: {
    type: String,
    enum: ['tablet', 'syrup', 'injection', 'cream', 'drops', 'capsule'],
    required: true
  },
  rackLocation: String,
  minStockLevel: {
    type: Number,
    default: 0
  },
  maxStockLevel: {
    type: Number,
    default: 0
  },
  gstRate: {
    type: Number,
    default: 12
  },
  discontinued: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// TEXT INDEX for search
medicineSchema.index({ name: 'text' });
medicineSchema.index({ genericId: 1 });
medicineSchema.index({ manufacturerId: 1 });
// Additional indexes for filter queries under load
medicineSchema.index({ discontinued: 1, category: 1 });
medicineSchema.index({ discontinued: 1, rackLocation: 1 });

export default mongoose.model('Medicine', medicineSchema);
