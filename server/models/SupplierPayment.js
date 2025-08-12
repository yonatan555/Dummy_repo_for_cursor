const mongoose = require('mongoose');

const supplierPaymentSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: String,
  paymentDate: {
    type: Date,
    required: true
  },
  method: {
    type: String,
    enum: ['bank_transfer', 'check', 'cash', 'credit_card'],
    required: true
  },
  invoiceNumber: String,
  receipt: {
    url: String,
    filename: String,
    uploadedAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'paid'
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  month: Number,
  year: Number
}, {
  timestamps: true
});

// Index for efficient queries
supplierPaymentSchema.index({ supplier: 1, year: 1, month: 1 });
supplierPaymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);