const axios = require('axios');
const { config } = require('../config/env');

const fast2smsService = {
  /**
   * Send 6-digit OTP to Indian mobile number (10 digits)
   */
  async sendOtp(phone, otp) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (config.fast2sms.apiKey === 'mock' || (config.nodeEnv === 'development' && config.fast2sms.apiKey === 'mock')) {
      console.log('\n=========================================');
      console.log(`📱 [Fast2SMS MOCK OTP] To: +91 ${cleanPhone}`);
      console.log(`🔐 OTP CODE: ${otp} (Valid for 5 minutes)`);
      console.log('=========================================\n');
      return { success: true, message: 'OTP sent successfully (Mock Mode)' };
    }

    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          variables_values: otp,
          route: 'otp',
          numbers: cleanPhone,
        },
        {
          headers: {
            authorization: config.fast2sms.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      if (response.data && response.data.return) {
        return { success: true, message: response.data.message[0] || 'OTP sent successfully' };
      } else {
        return { success: false, message: response.data?.message?.[0] || 'Failed to send OTP' };
      }
    } catch (error) {
      console.error('Fast2SMS sendOtp error:', error?.response?.data || error.message);
      return {
        success: false,
        message: error?.response?.data?.message?.[0] || 'SMS service temporary failure',
      };
    }
  },

  /**
   * Send Transactional Job Lifecycle SMS (Order received, Repaired, Delivered)
   */
  async sendJobStatusSms(params) {
    const cleanPhone = params.phone.replace(/\D/g, '').slice(-10);

    let messageText = '';
    switch (params.type) {
      case 'order_received':
        messageText = `Dear ${params.customerName}, your device has been received at ${params.shopName}. Job ID: ${params.jobId}. We will notify you once repaired. Contact: ${params.shopPhone || ''}`;
        break;
      case 'repaired':
        messageText = `Dear ${params.customerName}, your device for Job ID ${params.jobId} is REPAIRED and ready for pickup at ${params.shopName}.${params.amountDue ? ` Due: ₹${params.amountDue}.` : ''}`;
        break;
      case 'delivered':
        messageText = `Thank you ${params.customerName}! Device for Job ID ${params.jobId} has been DELIVERED by ${params.shopName}. We appreciate your business!`;
        break;
    }

    if (config.fast2sms.apiKey === 'mock') {
      console.log('\n=========================================');
      console.log(`💬 [Fast2SMS MOCK SMS] To: +91 ${cleanPhone} | Type: ${params.type}`);
      console.log(`📄 Message: ${messageText}`);
      console.log('=========================================\n');
      return { success: true, message: 'SMS simulated successfully' };
    }

    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: config.fast2sms.route, // 'q' (quick) or 'dlt'
          message: messageText,
          language: 'english',
          flash: 0,
          numbers: cleanPhone,
        },
        {
          headers: {
            authorization: config.fast2sms.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      return {
        success: response.data.return,
        message: response.data.message[0] || 'SMS sent successfully',
      };
    } catch (error) {
      console.error('Fast2SMS sendJobStatusSms error:', error?.response?.data || error.message);
      return {
        success: false,
        message: error?.response?.data?.message?.[0] || 'SMS delivery failed',
      };
    }
  },
};

module.exports = { fast2smsService };
