const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getSales,
  createSale,
  getSalesAnalytics
} = require('../controllers/salesController');

router.use(authenticate);

router.get('/analytics', getSalesAnalytics);
router.get('/', getSales);
router.post('/', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), createSale);

module.exports = router;
