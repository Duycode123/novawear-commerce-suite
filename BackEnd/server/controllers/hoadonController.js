const Bill = require('../model/hoadon');

exports.getAllBill = (req, res) => {

    Bill.getAll((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.getBillById = (req, res) => {
    const { ma_don_hang } = req.params;
    Bill.getById(ma_don_hang, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.deleteBill = (req, res) => {

    const { ma_don_hang } = req.params;

    Bill.delete(ma_don_hang, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Bill deleted successfully");
    });
};

exports.updateBill = (req, res) => {
    const { ma_don_hang } = req.params;
    const billData = req.body;
    Bill.update(ma_don_hang, billData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Update bill");
    });
};

// Hàm mới để tìm kiếm gần đúng theo tên sản phẩm
exports.searchBillByName = (req, res) => {
    
    const { searchTerm } = req.params; // Lấy search term từ URL params
    Bill.searchByName(searchTerm, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};