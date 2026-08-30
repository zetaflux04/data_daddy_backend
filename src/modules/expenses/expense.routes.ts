import { Router } from 'express';
import { expenseController } from './expense.controller';
import { authenticateJwt, requireRole } from '../../middlewares/auth';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole(['owner'])); // Only owners can view/manage expenses

router.get('/', expenseController.list);
router.post('/', expenseController.create);
router.delete('/:id', expenseController.delete);

export default router;
