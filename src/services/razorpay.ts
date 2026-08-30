import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/env';

let razorpayInstance: Razorpay | null = null;

export const getRazorpayInstance = (): Razorpay => {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return razorpayInstance;
};

export const razorpayService = {
  async createSubscriptionOrder(params: {
    amountInRupees: number;
    shopId: string;
    planType: string;
  }) {
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

  verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
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
