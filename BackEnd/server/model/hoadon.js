const db = require('../config/config');

const Bill = {

    getAll: (callback) => {
        const sqlGet = "SELECT * FROM don_hang";
        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    getById: (ma_don_hang, callback) => {
        const sqlGet = "SELECT * FROM don_hang WHERE ma_don_hang = ?";
        db.query(sqlGet, [ma_don_hang], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    update: (ma_don_hang, billData, callback) => {
        const {trang_thai} = billData;
        const sqlUpdate = "update don_hang set trang_thai=? where ma_don_hang = ?";
        db.query(sqlUpdate, [trang_thai,ma_don_hang], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    delete: (ma_don_hang, callback) => {
        const sqlDelete = "DELETE FROM don_hang WHERE ma_don_hang = ?";
        db.query(sqlDelete, [ma_don_hang], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
     // Thêm hàm tìm kiếm gần đúng
     searchByName: (searchTerm, callback) => {
        const sqlSearch = "SELECT * FROM don_hang WHERE ten_khach LIKE ?";
        const formattedSearchTerm = `%${searchTerm}%`; // Tìm kiếm gần đúng
        db.query(sqlSearch, [formattedSearchTerm], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    }

};

module.exports = Bill;