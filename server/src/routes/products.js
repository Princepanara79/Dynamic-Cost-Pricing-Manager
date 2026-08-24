const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  duplicateProduct,
  deleteProduct,
  getProductCostComparison,
  getCategories
} = require('../controllers/productController');

router.use(authenticate);

router.get('/categories', getCategories);
router.get('/comparison', getProductCostComparison);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/cost', getProductById); // Returns full transparent breakdown tree
router.post('/', authorize(['admin', 'user']), createProduct);
router.put('/:id', authorize(['admin', 'user']), updateProduct);
router.post('/:id/duplicate', authorize(['admin', 'user']), duplicateProduct);
router.delete('/:id', authorize(['admin']), deleteProduct);

module.exports = router;
