import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticateJwt, requireRole } from '../../middlewares/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/summary', analyticsController.getDashboardSummary);
router.get('/profit-loss', requireRole(['owner']), analyticsController.getProfitLoss);

export default router;
