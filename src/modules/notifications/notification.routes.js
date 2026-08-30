const { Router } = require('express');
const { notificationController } = require('./notification.controller');
const { authenticateJwt } = require('../../middlewares/auth');

const router = Router();

// Mobile app authenticated route
router.get('/', authenticateJwt, notificationController.getShopNotifications);

module.exports = router;
