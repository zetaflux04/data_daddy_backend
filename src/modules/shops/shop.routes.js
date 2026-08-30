const { Router } = require('express');
const { shopController } = require('./shop.controller');
const { authenticateJwt, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/profile', shopController.getProfile);
router.patch('/profile', requireRole(['owner']), shopController.updateProfile);
router.get('/staff', shopController.getStaff);
router.post('/staff', requireRole(['owner']), shopController.addStaff);

module.exports = router;
