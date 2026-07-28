const Employee = require('../model/nhanvien');

exports.getAllEmployees = (req, res) => {
    Employee.getAll((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.getEmployeeById = (req, res) => {
    const { ma_nhan_vien } = req.params;
    Employee.getById(ma_nhan_vien, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.createEmployee = (req, res) => {
    const employeeData = req.body;
    Employee.create(employeeData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Employee added successfully");
    });
};

exports.updateEmployee = (req, res) => {
    const { ma_nhan_vien } = req.params;
    const employeeData = req.body;
    Employee.update(ma_nhan_vien, employeeData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Employee updated successfully");
    });
};

exports.deleteEmployee = (req, res) => {
    const { ma_nhan_vien } = req.params;
    Employee.delete(ma_nhan_vien, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Employee deleted successfully");
    });
};

// Hàm mới để tìm kiếm gần đúng theo tên sản phẩm
exports.searchEmployeeByName = (req, res) => {
    const { searchTerm } = req.params; // Lấy search term từ URL params
    Employee.searchByName(searchTerm, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};