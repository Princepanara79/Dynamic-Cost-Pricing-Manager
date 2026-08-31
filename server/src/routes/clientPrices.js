const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getClientPrices,
  upsertClientPrice,
  deleteClientPrice
} = require('../controllers/clientPriceController');

router.use(authenticate);

router.get('/', getClientPrices);
router.post('/', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), upsertClientPrice);
router.delete('/:id', authorize(['manufacturer_admin', 'super_admin']), deleteClientPrice);

module.exports = router;
