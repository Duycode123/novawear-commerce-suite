const express = require('express');
const router = express.Router();
const customerController = require('../controllers/khachhangController');

router.get('/api/getallkh', customerController.getAllCustomers);
router.get('/api/getkh/:ma_khach_hang', customerController.getCustomerById);
router.post('/api/createkh', customerController.createCustomer);
router.put('/api/updatekh/:ma_khach_hang', customerController.updateCustomer);
router.delete('/api/deletekh/:ma_khach_hang', customerController.deleteCustomer);
router.get('/api/searchkh/:searchTerm', customerController.searchCustomerByName);
module.exports = router;
