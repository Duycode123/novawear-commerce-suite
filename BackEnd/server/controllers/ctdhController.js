const BillCT = require('../model/ctdh');

exports.getBillById = (req, res) => {
    const { ma_don_hang } = req.params;
    BillCT.getById(ma_don_hang, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};


exports.getTop5Products = (req, res) => {
    BillCT.getTop5ProductsDetails((err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
};


exports.getDetailsByCustomerId = (req, res) => {
    const { ma_khach_hang } = req.params;
    BillCT.getDetailsByCustomerId(ma_khach_hang, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        if (result.length === 0) {
            return res.status(404).send('Không có đơn hàng nào cho khách hàng này.');
        }
        res.json(result);
    });
};

