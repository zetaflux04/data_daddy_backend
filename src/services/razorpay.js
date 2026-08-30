const Razorpay = require('razorpay');
const crypto = require('crypto');
const { config } = require('../config/env');

let razorpayInstance = null;

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpayInstance;
};

const razorpayService = {
  async createSubscriptionOrder(params) {
    if (config.razorpay.keyId === 'mock_key_id') {
      return {
        id: `order_mock_${Date.now()}`,
        amount: params.amountInRupees * 100,
        currency: 'INR',
        receipt: `rcpt_${params.shopId.slice(-6)}_${Date.now()}`,
        notes: { shopId: params.shopId, planType: params.planType },
      };
    }

    const rzp = getRazorpayInstance();
    return await rzp.orders.create({
      amount: params.amountInRupees * 100, // paise
      currency: 'INR',
      receipt: `rcpt_${params.shopId.slice(-6)}_${Date.now()}`,
      notes: { shopId: params.shopId, planType: params.planType },
    });
  },

  verifyPaymentSignature(params) {
    if (config.razorpay.keyId === 'mock_key_id') {
      return true;
    }

    const text = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(text)
      .digest('hex');

    return expectedSignature === params.signature;
  },
};

module.exports = { getRazorpayInstance, razorpayService };
