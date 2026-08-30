const { Router } = require('express');
const { subscriptionController } = require('./subscription.controller');
const { authenticateJwt } = require('../../middlewares/auth');

const router = Router();

// Webhook endpoint (unauthenticated, verified via Razorpay HMAC signature)
router.post('/webhook', subscriptionController.handleWebhook);

// Authenticated routes
router.use(authenticateJwt);
router.post('/create-order', subscriptionController.createOrder);
router.post('/verify', subscriptionController.verifyPayment);

module.exports = router;
