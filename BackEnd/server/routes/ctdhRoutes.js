const express = require('express');
const router = express.Router();
const billController = require('../controllers/ctdhController');

router.get('/api/getctdh/:ma_don_hang',billController.getBillById)
router.get('/api/top5products', billController.getTop5Products);
router.get('/api/orderDetailsByCustomer/:ma_khach_hang', billController.getDetailsByCustomerId);
module.exports = router;