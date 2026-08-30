const { Shop } = require('../../models/Shop');
const { Subscription } = require('../../models/Subscription');
const { razorpayService } = require('../../services/razorpay');
const crypto = require('crypto');
const { config } = require('../../config/env');

const subscriptionController = {
  /**
   * Create Razorpay Order for Pro Subscription
   * POST /api/subscriptions/create-order
   * Body: { planType: "pro_monthly" | "pro_yearly" }
   */
  async createOrder(req, res) {
    const { planType = 'pro_monthly' } = req.body;
    const shopId = req.user.shopId;

    const amountInRupees = planType === 'pro_yearly' ? 4999 : 499;

    const rzpOrder = await razorpayService.createSubscriptionOrder({
      amountInRupees,
      shopId,
      planType,
    });

    const now = new Date();
    const endDate = new Date();
    if (planType === 'pro_yearly') {
      endDate.setFullYear(now.getFullYear() + 1);
    } else {
      endDate.setMonth(now.getMonth() + 1);
    }

    const sub = await Subscription.create({
      shopId,
      planType,
      amount: amountInRupees,
      startDate: now,
      endDate,
      paymentStatus: 'pending',
      razorpayOrderId: rzpOrder.id,
    });

    res.json({
      success: true,
      order: rzpOrder,
      subscriptionId: sub._id,
      keyId: config.razorpay.keyId,
    });
  },

  /**
   * Verify Payment and Activate Subscription
   * POST /api/subscriptions/verify
   * Body: { subscriptionId, razorpayOrderId, razorpayPaymentId, razorpaySignature }
   */
  async verifyPayment(req, res) {
    const { subscriptionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isValid = razorpayService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
      return;
    }

    const sub = await Subscription.findById(subscriptionId);
    if (!sub) {
      res.status(404).json({ success: false, message: 'Subscription record not found' });
      return;
    }

    sub.paymentStatus = 'completed';
    sub.razorpayPaymentId = razorpayPaymentId;
    await sub.save();

    // Upgrade Shop
    await Shop.findByIdAndUpdate(req.user.shopId, {
      $set: {
        'subscription.plan': 'pro',
        'subscription.status': 'active',
        'subscription.expiresAt': sub.endDate,
      },
    });

    res.json({
      success: true,
      message: 'Pro subscription activated successfully! Full access to repair guides and schematics unlocked.',
      expiresAt: sub.endDate,
    });
  },

  /**
   * Razorpay Webhook Handler
   * POST /api/subscriptions/webhook
   */
  async handleWebhook(req, res) {
    const signature = req.headers['x-razorpay-signature'];
    if (config.razorpay.webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', config.razorpay.webhookSecret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');
      if (digest !== signature) {
        res.status(400).json({ status: 'invalid_signature' });
        return;
      }
    }

    const event = req.body.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      if (notes.shopId) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await Shop.findByIdAndUpdate(notes.shopId, {
          $set: {
            'subscription.plan': 'pro',
            'subscription.status': 'active',
            'subscription.expiresAt': expiresAt,
          },
        });
      }
    }

    res.json({ status: 'ok' });
  },
};

module.exports = { subscriptionController };
