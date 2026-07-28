const Category = require('../../server/model/danhmuc');

exports.getAllCategories = (req, res) => {
    Category.getAll((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.getCategoryById = (req, res) => {
    const { ma_danh_muc } = req.params;
    Category.getById(ma_danh_muc, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};

exports.createCategory = (req, res) => {
    const categoryData = req.body;
    Category.create(categoryData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Category added successfully");
    });
};

exports.updateCategory = (req, res) => {
    const { ma_danh_muc } = req.params;
    const categoryData = req.body;
    Category.update(ma_danh_muc, categoryData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Category updated successfully");
    });
};

exports.deleteCategory = (req, res) => {
    const { ma_danh_muc } = req.params;
    Category.delete(ma_danh_muc, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Category deleted successfully");
    });
};

// Hàm mới để tìm kiếm gần đúng theo tên sản phẩm
exports.searchCategoryByName = (req, res) => {
    const { searchTerm } = req.params; // Lấy search term từ URL params
    Category.searchByName(searchTerm, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};
