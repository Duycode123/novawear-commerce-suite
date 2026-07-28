const Product = require('../../server/model/sanpham');

exports.getAllProducts = (req, res) => {
    const page = req.query.page
    const pageSize = req.query.pageSize || 10


    Product.getAll({page, pageSize}, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }

        console.log(result);
        res.send(page ?result[0] :result);
    });
};

exports.getProductById = (req, res) => {
    const { ma_san_pham } = req.params;
    Product.getById(ma_san_pham, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.createProduct = (req, res) => {
    const productData = req.body;
    Product.create(productData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Product added successfully");
    });
};

exports.updateProduct = (req, res) => {
    const { ma_san_pham } = req.params;
    const productData = req.body;
    Product.update(ma_san_pham, productData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Product updated successfully");
    });
};

exports.deleteProduct = (req, res) => {
    const { ma_san_pham } = req.params;
    Product.delete(ma_san_pham, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Product deleted successfully");
    });
};

exports.searchProductByName = (req, res) => {
    const { searchTerm } = req.params; 
    Product.searchByName(searchTerm, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};
