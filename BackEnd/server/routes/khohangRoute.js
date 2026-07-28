const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/khohangController');

router.get('/api/getallkhohang', warehouseController.getAllwarehouse);
router.get('/api/getkhohang/:ma_kho_hang', warehouseController.getwarehouseById);
router.post('/api/createkhohang', warehouseController.createwarehouse);
router.put('/api/updatekhohang/:ma_kho_hang', warehouseController.updatewarehouse);
router.delete('/api/deletekhohang/:ma_kho_hang', warehouseController.deletewarehouse);
router.get('/api/searchkhohang/:searchTerm', warehouseController.searchWarehouseByName);
module.exports = router;