import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticateJwt } from '../../middlewares/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', customerController.listOrSearch);
router.post('/', customerController.create);
router.get('/:id', customerController.getDetails);

export default router;
