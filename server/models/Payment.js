const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  resident: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['monthly_maintenance', 'special_assessment', 'penalty', 'other'],
    required: true
  },
  description: String,
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partial'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bit', 'paybox', 'bank_transfer', 'cash', 'check']
  },
  transactionId: String,
  receipt: {
    url: String,
    filename: String,
    uploadedAt: Date
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  month: Number,
  year: Number
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ resident: 1, year: 1, month: 1 });
paymentSchema.index({ status: 1, dueDate: 1 });

// Calculate overdue payments
paymentSchema.methods.isOverdue = function() {
  return this.status === 'pending' && new Date() > this.dueDate;
};

module.exports = mongoose.model('Payment', paymentSchema);