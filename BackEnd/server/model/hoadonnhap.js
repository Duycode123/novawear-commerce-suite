const db = require('../config/config');

const BillInput = {

    getAll: (callback) => {
        const sqlGet = "SELECT * FROM hoa_don_nhap";
        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    getById: (ma_hoa_don, callback) => {
        const sqlGet = "SELECT * FROM chi_tiet_hoa_don_nhap WHERE ma_hoa_don = ?";
        db.query(sqlGet, [ma_hoa_don], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    create: (billinputData, callback) => {
        const {ngay_nhap,tong_tien,ten_ncc,sdt,ma_nhan_vien,email,dia_chi} = billinputData;
        const sqlInsert = "Insert into hoa_don_nhap (ngay_nhap,tong_tien,ten_ncc,sdt,ma_nhan_vien,email,dia_chi) values(?,?,?,?,?,?,?)";
        db.query(sqlInsert, [ngay_nhap,tong_tien,ten_ncc,sdt,ma_nhan_vien,email,dia_chi], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },



};

module.exports = BillInput;