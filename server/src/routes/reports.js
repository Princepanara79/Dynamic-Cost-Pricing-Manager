const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getProductCostReport,
  getMaterialImpactReport,
  getClientProfitReport
} = require('../controllers/reportsController');

router.use(authenticate);

router.get('/product-cost', getProductCostReport);
router.get('/material-impact', getMaterialImpactReport);
router.get('/client-profit', getClientProfitReport);

module.exports = router;
