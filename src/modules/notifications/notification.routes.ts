import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticateJwt } from '../../middlewares/auth';

const router = Router();

// Mobile app authenticated route
router.get('/', authenticateJwt, notificationController.getShopNotifications);

export default router;
