const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/danhmucController');

router.get('/api/getalldm', categoryController.getAllCategories);
router.get('/api/getdm/:ma_danh_muc', categoryController.getCategoryById);
router.post('/api/createdm', categoryController.createCategory);
router.put('/api/updatedm/:ma_danh_muc', categoryController.updateCategory);
router.delete('/api/deletedm/:ma_danh_muc', categoryController.deleteCategory);
router.get('/api/searchdm/:searchTerm', categoryController.searchCategoryByName);
module.exports = router;
