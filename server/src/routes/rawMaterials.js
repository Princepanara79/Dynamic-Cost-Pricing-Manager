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

router.post('/', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), createRawMaterial);
router.put('/:id', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), updateRawMaterial);
router.put('/:id/price', authorize(['manufacturer_admin', 'manufacturer', 'super_admin']), updatePrice);
router.delete('/:id', authorize(['manufacturer_admin', 'super_admin']), deleteRawMaterial);

module.exports = router;
