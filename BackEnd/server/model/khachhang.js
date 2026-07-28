const db = require('../config/config');

const Customer = {
    getAll: (callback) => {
        const sqlGet = "SELECT * FROM khach_hang";
        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    getById: (ma_khach_hang, callback) => {
        const sqlGet = "SELECT * FROM khach_hang WHERE ma_khach_hang = ?";
        db.query(sqlGet, ma_khach_hang, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    create: (customerData, callback) => {
        const { ten_khach_hang, email, so_dien_thoai, dia_chi } = customerData;
        const sqlInsert = "INSERT INTO khach_hang (ten_khach_hang, email, so_dien_thoai, dia_chi) VALUES (?, ?, ?, ?)";
        db.query(sqlInsert, [ten_khach_hang, email, so_dien_thoai, dia_chi], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    update: (ma_khach_hang, customerData, callback) => {
        const { ten_khach_hang, email, so_dien_thoai, dia_chi } = customerData;
        const sqlUpdate = "UPDATE khach_hang SET ten_khach_hang = ?, email = ?, so_dien_thoai = ?, dia_chi = ? WHERE ma_khach_hang = ?";
        db.query(sqlUpdate, [ten_khach_hang, email, so_dien_thoai, dia_chi, ma_khach_hang], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    delete: (ma_khach_hang, callback) => {
        const sqlDelete = "DELETE FROM khach_hang WHERE ma_khach_hang = ?";
        db.query(sqlDelete, ma_khach_hang, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
     // Thêm hàm tìm kiếm gần đúng
     searchByName: (searchTerm, callback) => {
        const sqlSearch = "SELECT * FROM khach_hang WHERE ten_khach_hang LIKE ?";
        const formattedSearchTerm = `%${searchTerm}%`; // Tìm kiếm gần đúng
        db.query(sqlSearch, [formattedSearchTerm], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    }
};

module.exports = Customer;
