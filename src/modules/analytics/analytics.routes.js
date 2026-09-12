const { Router } = require('express');
const { analyticsController } = require('./analytics.controller');
const { authenticateJwt, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/summary', analyticsController.getDashboardSummary);
router.get('/insights', analyticsController.getInsights);
router.get('/profit-loss', requireRole(['owner']), analyticsController.getProfitLoss);

module.exports = router;
