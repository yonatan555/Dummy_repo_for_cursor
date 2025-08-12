const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'payment_reminder', // תזכורת תשלום
      'payment_overdue', // תשלום באיחור
      'maintenance_update', // עדכון תחזוקה
      'general_announcement', // הודעה כללית
      'system_alert', // התראת מערכת
      'welcome', // ברוכים הבאים
      'password_reset' // איפוס סיסמה
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  channels: {
    whatsapp: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      messageId: String,
      error: String
    },
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      messageId: String,
      error: String
    },
    inApp: {
      read: {
        type: Boolean,
        default: false
      },
      readAt: Date
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  scheduledFor: Date,
  data: {
    // Additional data for specific notification types
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    maintenanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Maintenance'
    },
    amount: Number,
    dueDate: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1, scheduledFor: 1 });
notificationSchema.index({ 'channels.inApp.read': 1 });

module.exports = mongoose.model('Notification', notificationSchema);