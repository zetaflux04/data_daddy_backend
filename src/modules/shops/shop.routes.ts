import { Router } from 'express';
import { shopController } from './shop.controller';
import { authenticateJwt, requireRole } from '../../middlewares/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/profile', shopController.getProfile);
router.patch('/profile', requireRole(['owner']), shopController.updateProfile);
router.get('/staff', shopController.getStaff);
router.post('/staff', requireRole(['owner']), shopController.addStaff);

export default router;
