const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/nhanvienController');

router.get('/api/getallnv', employeeController.getAllEmployees);
router.get('/api/getnv/:ma_nhan_vien', employeeController.getEmployeeById);
router.post('/api/createnv', employeeController.createEmployee);
router.put('/api/updatenv/:ma_nhan_vien', employeeController.updateEmployee);
router.delete('/api/deletenv/:ma_nhan_vien', employeeController.deleteEmployee);
router.get('/api/searchnv/:searchTerm', employeeController.searchEmployeeByName);
module.exports = router;
