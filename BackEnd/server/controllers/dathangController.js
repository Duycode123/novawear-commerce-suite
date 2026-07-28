const Order = require('../model/dathang');

exports.addOrder = (req, res) => {
    
    const orderData = req.body;

    Order.addOrder(orderData, (err, message) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.status(200).send('thanh cong');
    });
};


