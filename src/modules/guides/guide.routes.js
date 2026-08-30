const { Router } = require('express');
const { guideController } = require('./guide.controller');
const { authenticateJwt } = require('../../middlewares/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', guideController.list);
router.post('/seed', guideController.seedSamples);
router.get('/:id', guideController.getDetails);

module.exports = router;
