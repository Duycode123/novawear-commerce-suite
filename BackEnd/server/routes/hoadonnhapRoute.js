const express = require('express');
const router = express.Router();
const billinputController = require('../controllers/hoadonnhapController');

router.get('/api/getallhdn', billinputController.getAllBillIP);
router.get('/api/getcthdn/:ma_hoa_don',billinputController.getBillById)
router.post('/api/createhdn', billinputController.createBillIP);
module.exports = router;