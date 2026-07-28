const db = require('../config/config');

const Employee = {
    getAll: (callback) => {
        const sqlGet = "SELECT * FROM nhan_vien";
        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    getById: (ma_nhan_vien, callback) => {
        const sqlGet = "SELECT * FROM nhan_vien WHERE ma_nhan_vien = ?";
        db.query(sqlGet, ma_nhan_vien, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    create: (employeeData, callback) => {
        const { ten_nhan_vien, gioi_tinh, dia_chi, ngay_sinh, sdt, cmnd, anh_nhanvien } = employeeData;
        const sqlInsert = "INSERT INTO nhan_vien (ten_nhan_vien, gioi_tinh, dia_chi, ngay_sinh, sdt, cmnd, anh_nhanvien) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sqlInsert, [ten_nhan_vien, gioi_tinh, dia_chi, ngay_sinh, sdt, cmnd, anh_nhanvien], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    update: (ma_nhan_vien, employeeData, callback) => {
        const { ten_nhan_vien, gioi_tinh, dia_chi, ngay_sinh, sdt, cmnd, anh_nhanvien } = employeeData;
        const sqlUpdate = "UPDATE nhan_vien SET ten_nhan_vien = ?, gioi_tinh = ?, dia_chi = ?, ngay_sinh = ?, sdt = ?, cmnd = ?, anh_nhanvien = ? WHERE ma_nhan_vien = ?";
        db.query(sqlUpdate, [ten_nhan_vien, gioi_tinh, dia_chi, ngay_sinh, sdt, cmnd, anh_nhanvien, ma_nhan_vien], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    delete: (ma_nhan_vien, callback) => {
        const sqlDelete = "DELETE FROM nhan_vien WHERE ma_nhan_vien = ?";
        db.query(sqlDelete, ma_nhan_vien, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
     // Thêm hàm tìm kiếm gần đúng
     searchByName: (searchTerm, callback) => {
        const sqlSearch = "SELECT * FROM nhan_vien WHERE ten_nhan_vien LIKE ?";
        const formattedSearchTerm = `%${searchTerm}%`; // Tìm kiếm gần đúng
        db.query(sqlSearch, [formattedSearchTerm], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    }
};

module.exports = Employee;
