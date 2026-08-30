const { Router } = require('express');
const { customerController } = require('./customer.controller');
const { authenticateJwt } = require('../../middlewares/auth');

const router = Router();

router.use(authenticateJwt);

router.get('/', customerController.listOrSearch);
router.post('/', customerController.create);
router.get('/:id', customerController.getDetails);

module.exports = router;
