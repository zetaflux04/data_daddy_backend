import { Router } from 'express';
import { orderController } from './order.controller';
import { authenticateJwt } from '../../middlewares/auth';

const router = Router();

router.use(authenticateJwt);

router.post('/', orderController.create);
router.get('/', orderController.list);
router.get('/:id', orderController.getOne);
router.patch('/:id/status', orderController.updateStatus);
router.post('/:id/payments', orderController.addPayment);

export default router;
