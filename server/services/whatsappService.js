const axios = require('axios');

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.isEnabled = !!(this.accessToken && this.phoneNumberId);
  }

  // Format phone number to international format
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 972 (Israel country code)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '972' + cleanPhone.substring(1);
    }
    
    // If doesn't start with country code, add Israel code
    if (!cleanPhone.startsWith('972')) {
      cleanPhone = '972' + cleanPhone;
    }
    
    return cleanPhone;
  }

  // Send text message
  async sendMessage(phone, message) {
    if (!this.isEnabled) {
      console.log('WhatsApp service not configured');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error) {
      console.error('WhatsApp send error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  // Send payment reminder message
  async sendPaymentReminder(user, payment) {
    const message = this.buildPaymentReminderMessage(user, payment);
    return await this.sendMessage(user.phone, message);
  }

  // Send overdue payment message
  async sendOverduePaymentMessage(user, payment) {
    const message = this.buildOverduePaymentMessage(user, payment);
    return await this.sendMessage(user.phone, message);
  }

  // Send maintenance update message
  async sendMaintenanceUpdate(user, maintenance, updateMessage) {
    const message = this.buildMaintenanceUpdateMessage(user, maintenance, updateMessage);
    return await this.sendMessage(user.phone, message);
  }

  // Send general announcement
  async sendAnnouncement(user, title, message) {
    const fullMessage = this.buildAnnouncementMessage(user, title, message);
    return await this.sendMessage(user.phone, fullMessage);
  }

  // Build payment reminder message
  buildPaymentReminderMessage(user, payment) {
    const dueDate = new Date(payment.dueDate).toLocaleDateString('he-IL');
    const amount = payment.amount.toLocaleString('he-IL');
    
    return `שלום ${user.firstName},

תזכורת תשלום דמי ועד בית:
💰 סכום: ₪${amount}
📅 תאריך יעד: ${dueDate}
🏠 דירה: ${user.apartment?.number || 'לא צוין'}

לתשלום באמצעות:
💳 Bit/PayBox: העלה אסמכתא במערכת
🏦 העברה בנקאית: פרטי החשבון במערכת

תודה,
הנהלת הבניין`;
  }

  // Build overdue payment message
  buildOverduePaymentMessage(user, payment) {
    const dueDate = new Date(payment.dueDate).toLocaleDateString('he-IL');
    const amount = payment.amount.toLocaleString('he-IL');
    const daysOverdue = Math.floor((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24));
    
    return `שלום ${user.firstName},

⚠️ הודעה על איחור בתשלום דמי ועד בית:
💰 סכום: ₪${amount}
📅 תאריך יעד: ${dueDate}
⏰ איחור: ${daysOverdue} ימים
🏠 דירה: ${user.apartment?.number || 'לא צוין'}

אנא פנה להסדרת התשלום בהקדם.

תודה,
הנהלת הבניין`;
  }

  // Build maintenance update message
  buildMaintenanceUpdateMessage(user, maintenance, updateMessage) {
    return `שלום ${user.firstName},

עדכון בבקשת תחזוקה:
🔧 ${maintenance.title}
📍 מיקום: ${maintenance.location?.apartment || maintenance.location?.commonArea || 'לא צוין'}
📊 סטטוס: ${this.getStatusInHebrew(maintenance.status)}

📝 עדכון: ${updateMessage}

תודה,
הנהלת הבניין`;
  }

  // Build announcement message
  buildAnnouncementMessage(user, title, message) {
    return `שלום ${user.firstName},

📢 הודעה מהנהלת הבניין:

${title}

${message}

תודה,
הנהלת הבניין`;
  }

  // Get status in Hebrew
  getStatusInHebrew(status) {
    const statusMap = {
      'open': 'פתוח',
      'in_progress': 'בטיפול',
      'resolved': 'נפתר',
      'closed': 'סגור',
      'cancelled': 'בוטל'
    };
    return statusMap[status] || status;
  }

  // Send bulk messages
  async sendBulkMessages(recipients, messageBuilder) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const message = await messageBuilder(recipient);
        const result = await this.sendMessage(recipient.phone, message);
        results.push({
          recipient: recipient._id,
          phone: recipient.phone,
          ...result
        });
        
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          recipient: recipient._id,
          phone: recipient.phone,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Test connection
  async testConnection() {
    if (!this.isEnabled) {
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = new WhatsAppService();