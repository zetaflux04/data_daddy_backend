import { Router } from 'express';
import { subscriptionController } from './subscription.controller';
import { authenticateJwt } from '../../middlewares/auth';

const router = Router();

// Webhook endpoint (unauthenticated, verified via Razorpay HMAC signature)
router.post('/webhook', subscriptionController.handleWebhook);

// Authenticated routes
router.use(authenticateJwt);
router.post('/create-order', subscriptionController.createOrder);
router.post('/verify', subscriptionController.verifyPayment);

export default router;
