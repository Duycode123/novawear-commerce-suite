const express = require('express');
const router = express.Router();
const billController = require('../controllers/hoadonController');

router.get('/api/getalldonhang', billController.getAllBill);
router.delete('/api/deletedonhang/:ma_don_hang', billController.deleteBill);
router.get('/api/gethd/:ma_don_hang', billController.getBillById);
router.get('/api/searchhd/:searchTerm', billController.searchBillByName);
router.put('/api/updatehd/:ma_don_hang', billController.updateBill);
module.exports = router;