import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

router.post('/otp/request', authController.requestOtp);
router.post('/otp/verify', authController.verifyOtp);
router.post('/register', authController.registerShop);

export default router;
