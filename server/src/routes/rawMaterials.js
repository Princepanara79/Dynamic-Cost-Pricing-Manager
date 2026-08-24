const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  previewPriceImpact,
  updatePrice,
  deleteRawMaterial,
  getPriceHistory,
  getCategories
} = require('../controllers/rawMaterialController');

router.use(authenticate);

router.get('/categories', getCategories);
router.get('/', getRawMaterials);
router.get('/:id', getRawMaterialById);
router.get('/:id/history', getPriceHistory);
router.get('/:id/impact-preview', previewPriceImpact);

router.post('/', authorize(['admin', 'user']), createRawMaterial);
router.put('/:id', authorize(['admin', 'user']), updateRawMaterial);
router.put('/:id/price', authorize(['admin', 'user']), updatePrice);
router.delete('/:id', authorize(['admin']), deleteRawMaterial);

module.exports = router;
