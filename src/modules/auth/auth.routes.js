const { Router } = require('express');
const { authController } = require('./auth.controller');

const router = Router();

router.post('/otp/request', authController.requestOtp);
router.post('/otp/verify', authController.verifyOtp);
router.post('/register', authController.registerShop);

module.exports = router;
