const BillInput = require('../model/hoadonnhap');

exports.getAllBillIP = (req, res) => {

    BillInput.getAll((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.getBillById = (req, res) => {
    const { ma_hoa_don } = req.params;
    BillInput.getById(ma_hoa_don, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.createBillIP = (req, res) => {
    const billinputData = req.body;
    BillInput.create(billinputData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Bill added successfully");
    });
};

