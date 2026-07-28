const Customer = require('../model/khachhang');

exports.getAllCustomers = (req, res) => {
    Customer.getAll((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.getCustomerById = (req, res) => {
    const { ma_khach_hang } = req.params;
    Customer.getById(ma_khach_hang, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.createCustomer = (req, res) => {
    const customerData = req.body;
    Customer.create(customerData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Customer added successfully");
    });
};

exports.updateCustomer = (req, res) => {
    const { ma_khach_hang } = req.params;
    const customerData = req.body;
    Customer.update(ma_khach_hang, customerData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Customer updated successfully");
    });
};

exports.deleteCustomer = (req, res) => {
    const { ma_khach_hang } = req.params;
    Customer.delete(ma_khach_hang, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Customer deleted successfully");
    });
};

// Hàm mới để tìm kiếm gần đúng theo tên sản phẩm
exports.searchCustomerByName = (req, res) => {
    const { searchTerm } = req.params; // Lấy search term từ URL params
    Customer.searchByName(searchTerm, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};