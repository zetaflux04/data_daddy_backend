import { Router } from 'express';
import { guideController } from './guide.controller';
import { authenticateJwt } from '../../middlewares/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', guideController.list);
router.post('/seed', guideController.seedSamples);
router.get('/:id', guideController.getDetails);

export default router;
