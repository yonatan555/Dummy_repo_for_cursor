const Notification = require('../models/Notification');
const User = require('../models/User');
const Payment = require('../models/Payment');
const whatsappService = require('./whatsappService');
const cron = require('cron');

class NotificationService {
  constructor() {
    this.initializeScheduledJobs();
  }

  // Initialize scheduled jobs
  initializeScheduledJobs() {
    // Daily check for overdue payments at 9 AM
    new cron.CronJob('0 9 * * *', async () => {
      console.log('Running daily overdue payment check...');
      await this.checkOverduePayments();
    }, null, true, 'Asia/Jerusalem');

    // Monthly payment reminders on 15th of each month at 10 AM
    new cron.CronJob('0 10 15 * *', async () => {
      console.log('Running monthly payment reminders...');
      await this.sendMonthlyPaymentReminders();
    }, null, true, 'Asia/Jerusalem');

    // Process scheduled notifications every hour
    new cron.CronJob('0 * * * *', async () => {
      await this.processScheduledNotifications();
    }, null, true, 'Asia/Jerusalem');
  }

  // Create notification
  async createNotification(data) {
    try {
      const notification = new Notification(data);
      await notification.save();
      
      // Send immediately if not scheduled
      if (!data.scheduledFor || new Date(data.scheduledFor) <= new Date()) {
        await this.sendNotification(notification);
      }
      
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Send notification through all enabled channels
  async sendNotification(notification) {
    try {
      const user = await User.findById(notification.recipient);
      if (!user || !user.isActive) {
        return;
      }

      const results = {};

      // Send WhatsApp message
      if (user.notifications.whatsapp && whatsappService.isEnabled) {
        try {
          const whatsappResult = await whatsappService.sendMessage(user.phone, notification.message);
          
          notification.channels.whatsapp.sent = whatsappResult.success;
          notification.channels.whatsapp.sentAt = new Date();
          
          if (whatsappResult.success) {
            notification.channels.whatsapp.messageId = whatsappResult.messageId;
          } else {
            notification.channels.whatsapp.error = whatsappResult.error;
          }
          
          results.whatsapp = whatsappResult;
        } catch (error) {
          notification.channels.whatsapp.error = error.message;
          results.whatsapp = { success: false, error: error.message };
        }
      }

      // Mark as read in-app (will be shown in user dashboard)
      notification.channels.inApp.read = false;

      await notification.save();
      return results;
    } catch (error) {
      console.error('Send notification error:', error);
      throw error;
    }
  }

  // Send payment reminder
  async sendPaymentReminder(paymentId, customMessage = null) {
    try {
      const payment = await Payment.findById(paymentId).populate('resident');
      if (!payment) {
        throw new Error('Payment not found');
      }

      const message = customMessage || this.buildPaymentReminderMessage(payment);
      
      const notification = await this.createNotification({
        recipient: payment.resident._id,
        type: 'payment_reminder',
        title: 'תזכורת תשלום',
        message,
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          dueDate: payment.dueDate
        }
      });

      return notification;
    } catch (error) {
      console.error('Send payment reminder error:', error);
      throw error;
    }
  }

  // Send overdue payment notification
  async sendOverduePaymentNotification(paymentId) {
    try {
      const payment = await Payment.findById(paymentId).populate('resident');
      if (!payment) {
        throw new Error('Payment not found');
      }

      const daysOverdue = Math.floor((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24));
      const message = this.buildOverduePaymentMessage(payment, daysOverdue);
      
      const notification = await this.createNotification({
        recipient: payment.resident._id,
        type: 'payment_overdue',
        title: 'תשלום באיחור',
        message,
        priority: 'high',
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          dueDate: payment.dueDate
        }
      });

      return notification;
    } catch (error) {
      console.error('Send overdue payment notification error:', error);
      throw error;
    }
  }

  // Send maintenance update notification
  async sendMaintenanceUpdate(maintenanceId, updateMessage, recipientId = null) {
    try {
      const maintenance = await Maintenance.findById(maintenanceId)
        .populate('reportedBy')
        .populate('assignedTo');
      
      if (!maintenance) {
        throw new Error('Maintenance request not found');
      }

      const recipients = [];
      
      if (recipientId) {
        recipients.push(recipientId);
      } else {
        // Send to reporter and assigned person
        recipients.push(maintenance.reportedBy._id);
        if (maintenance.assignedTo) {
          recipients.push(maintenance.assignedTo._id);
        }
      }

      const notifications = [];
      for (const recipient of recipients) {
        const message = this.buildMaintenanceUpdateMessage(maintenance, updateMessage);
        
        const notification = await this.createNotification({
          recipient,
          type: 'maintenance_update',
          title: 'עדכון תחזוקה',
          message,
          data: {
            maintenanceId: maintenance._id
          }
        });
        
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Send maintenance update error:', error);
      throw error;
    }
  }

  // Send general announcement to all residents
  async sendGeneralAnnouncement(title, message, targetRole = 'resident') {
    try {
      const users = await User.find({ 
        role: targetRole, 
        isActive: true 
      });

      const notifications = [];
      for (const user of users) {
        const notification = await this.createNotification({
          recipient: user._id,
          type: 'general_announcement',
          title,
          message,
          priority: 'medium'
        });
        
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Send general announcement error:', error);
      throw error;
    }
  }

  // Check for overdue payments and send notifications
  async checkOverduePayments() {
    try {
      const overduePayments = await Payment.find({
        status: 'pending',
        dueDate: { $lt: new Date() }
      }).populate('resident');

      console.log(`Found ${overduePayments.length} overdue payments`);

      for (const payment of overduePayments) {
        // Check if we already sent an overdue notification today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await Notification.findOne({
          recipient: payment.resident._id,
          type: 'payment_overdue',
          'data.paymentId': payment._id,
          createdAt: { $gte: today }
        });

        if (!existingNotification) {
          await this.sendOverduePaymentNotification(payment._id);
        }
      }
    } catch (error) {
      console.error('Check overdue payments error:', error);
    }
  }

  // Send monthly payment reminders
  async sendMonthlyPaymentReminders() {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const pendingPayments = await Payment.find({
        status: 'pending',
        month: currentMonth,
        year: currentYear
      }).populate('resident');

      console.log(`Sending ${pendingPayments.length} monthly payment reminders`);

      for (const payment of pendingPayments) {
        await this.sendPaymentReminder(payment._id);
      }
    } catch (error) {
      console.error('Send monthly payment reminders error:', error);
    }
  }

  // Process scheduled notifications
  async processScheduledNotifications() {
    try {
      const scheduledNotifications = await Notification.find({
        scheduledFor: { $lte: new Date() },
        'channels.whatsapp.sent': false,
        'channels.email.sent': false
      });

      for (const notification of scheduledNotifications) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Process scheduled notifications error:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId, page = 1, limit = 10) {
    try {
      const notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments({ recipient: userId });
      const unreadCount = await Notification.countDocuments({ 
        recipient: userId,
        'channels.inApp.read': false 
      });

      return {
        notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        unreadCount
      };
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { 
          'channels.inApp.read': true,
          'channels.inApp.readAt': new Date()
        },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  // Build payment reminder message
  buildPaymentReminderMessage(payment) {
    const dueDate = new Date(payment.dueDate).toLocaleDateString('he-IL');
    const amount = payment.amount.toLocaleString('he-IL');
    
    return `תזכורת תשלום דמי ועד בית:
💰 סכום: ₪${amount}
📅 תאריך יעד: ${dueDate}
🏠 דירה: ${payment.resident.apartment?.number || 'לא צוין'}

לתשלום במערכת או באמצעות Bit/PayBox`;
  }

  // Build overdue payment message
  buildOverduePaymentMessage(payment, daysOverdue) {
    const dueDate = new Date(payment.dueDate).toLocaleDateString('he-IL');
    const amount = payment.amount.toLocaleString('he-IL');
    
    return `⚠️ תשלום באיחור:
💰 סכום: ₪${amount}
📅 תאריך יעד: ${dueDate}
⏰ איחור: ${daysOverdue} ימים
🏠 דירה: ${payment.resident.apartment?.number || 'לא צוין'}

אנא פנה להסדרת התשלום בהקדם`;
  }

  // Build maintenance update message
  buildMaintenanceUpdateMessage(maintenance, updateMessage) {
    return `עדכון בבקשת תחזוקה:
🔧 ${maintenance.title}
📍 מיקום: ${maintenance.location?.apartment || maintenance.location?.commonArea || 'לא צוין'}
📝 עדכון: ${updateMessage}`;
  }
}

module.exports = new NotificationService();