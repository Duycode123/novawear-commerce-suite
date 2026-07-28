const express = require('express');
const router = express.Router();
const productController = require('../controllers/sanphamController');

router.get('/api/getallsp', productController.getAllProducts);
router.get('/api/getsp/:ma_san_pham', productController.getProductById);
router.post('/api/createsp', productController.createProduct);
router.put('/api/updatesp/:ma_san_pham', productController.updateProduct);
router.delete('/api/deletesp/:ma_san_pham', productController.deleteProduct);
router.get('/api/searchsp/:searchTerm', productController.searchProductByName);

module.exports = router;
    