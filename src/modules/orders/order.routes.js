const { Router } = require('express');
const { orderController } = require('./order.controller');
const { authenticateJwt } = require('../../middlewares/auth');

const router = Router();

router.use(authenticateJwt);

router.post('/', orderController.create);
router.get('/', orderController.list);
router.get('/:id', orderController.getOne);
router.patch('/:id/status', orderController.updateStatus);
router.post('/:id/payments', orderController.addPayment);

module.exports = router;
