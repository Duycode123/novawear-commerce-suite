const express = require('express');
const router = express.Router();
const accountController = require('../controllers/taikhoanController');

// Tạo mới tài khoản
router.post('/api/createaccount', accountController.createAccount);

// Đăng nhập tài khoản
router.post('/api/login', accountController.loginAccount);

router.get('/api/getalltaikhoan', accountController.getAllAccount);

module.exports = router;
