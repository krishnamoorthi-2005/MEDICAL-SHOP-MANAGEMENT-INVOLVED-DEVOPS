import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  dateOfBirth: {
    type: Date,
  },
  notes: {
    type: String,
    default: '',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Denormalised stats — updated on every sale
  totalSpent: {
    type: Number,
    default: 0,
  },
  totalVisits: {
    type: Number,
    default: 0,
  },
  lastVisit: {
    type: Date,
  },
  nextPurchaseDate: {
    type: Date,
  },
}, {
  timestamps: true,
});

customerSchema.index({ name: 'text', phone: 'text', email: 'text' });
// Note: phone already has a unique index from the field definition
customerSchema.index({ isActive: 1 });
customerSchema.index({ userId: 1, isActive: 1 }); // Compound index for user-scoped queries

export default mongoose.model('Customer', customerSchema);
