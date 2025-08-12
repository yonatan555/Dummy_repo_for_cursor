const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'gardener', // גנן
      'cleaner', // מנקה
      'guest_insurance', // ביטוח אורחים
      'elevators', // מעליות
      'solar_maintenance', // טיפול דודי שמש
      'pumps', // משאבות
      'maintenance_person', // איש תחזוקה
      'bezeq', // בזק
      'security', // אבטחה
      'electricity', // חשמל
      'water', // מים
      'gas', // גז
      'other' // אחר
    ],
    required: true
  },
  contactPerson: String,
  phone: {
    type: String,
    required: true
  },
  email: String,
  address: {
    street: String,
    city: String,
    zipCode: String
  },
  businessNumber: String, // מספר עסק
  vatNumber: String, // מספר עמותה
  bankDetails: {
    accountNumber: String,
    bankName: String,
    branchNumber: String
  },
  contractDetails: {
    startDate: Date,
    endDate: Date,
    monthlyAmount: Number,
    description: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String,
  documents: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastPayment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierPayment'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);