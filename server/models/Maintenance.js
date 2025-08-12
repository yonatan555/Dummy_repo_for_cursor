const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'plumbing', // אינסטלציה
      'electrical', // חשמל
      'elevator', // מעלית
      'cleaning', // ניקיון
      'gardening', // גינון
      'security', // אבטחה
      'painting', // צביעה
      'general', // כללי
      'emergency' // חירום
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'open'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  location: {
    apartment: String,
    floor: Number,
    building: String,
    commonArea: String
  },
  images: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  estimatedCost: Number,
  actualCost: Number,
  scheduledDate: Date,
  completedDate: Date,
  notes: String,
  updates: [{
    message: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    status: String
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSchedule: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDue: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
maintenanceSchema.index({ status: 1, priority: 1 });
maintenanceSchema.index({ reportedBy: 1 });
maintenanceSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);