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
router.post('/', authorize(['admin', 'user']), upsertClientPrice);
router.delete('/:id', authorize(['admin']), deleteClientPrice);

module.exports = router;
