const db = require('../config/config');

const Category = {
    getAll: (callback) => {
        const sqlGet = "SELECT * FROM danh_muc_san_pham";
        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    getById: (ma_danh_muc, callback) => {
        const sqlGet = "SELECT * FROM danh_muc_san_pham WHERE ma_danh_muc = ?";
        db.query(sqlGet, ma_danh_muc, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    create: (categoryData, callback) => {
        const { ten_danh_muc } = categoryData;
        const sqlInsert = "INSERT INTO danh_muc_san_pham (ten_danh_muc) VALUES (?)";
        db.query(sqlInsert, [ten_danh_muc], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    update: (ma_danh_muc, categoryData, callback) => {
        const { ten_danh_muc } = categoryData;
        const sqlUpdate = "UPDATE danh_muc_san_pham SET ten_danh_muc = ? WHERE ma_danh_muc = ?";
        db.query(sqlUpdate, [ten_danh_muc, ma_danh_muc], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    delete: (ma_danh_muc, callback) => {
        const sqlDelete = "DELETE FROM danh_muc_san_pham WHERE ma_danh_muc = ?";
        db.query(sqlDelete, ma_danh_muc, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
      // Thêm hàm tìm kiếm gần đúng
      searchByName: (searchTerm, callback) => {
        const sqlSearch = "SELECT * FROM danh_muc_san_pham WHERE ten_danh_muc LIKE ?";
        const formattedSearchTerm = `%${searchTerm}%`; // Tìm kiếm gần đúng
        db.query(sqlSearch, [formattedSearchTerm], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    }
};

module.exports = Category;
