const { Router } = require('express');
const { expenseController } = require('./expense.controller');
const { authenticateJwt, requireRole } = require('../../middlewares/auth');

const router = Router();

router.use(authenticateJwt);
router.use(requireRole(['owner'])); // Only owners can view/manage expenses

router.get('/', expenseController.list);
router.post('/', expenseController.create);
router.delete('/:id', expenseController.delete);

module.exports = router;
