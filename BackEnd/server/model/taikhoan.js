const db = require('../config/config.js')
const bcrypt = require('bcrypt');
const saltRounds = 10;

const Account = {
    // Phương thức tạo tài khoản (đã có)
    create: (accountData, callback) => {
        const { ten_nguoi_dung, mat_khau, email, anh_nguoi_dung, sdt } = accountData;
        bcrypt.hash(mat_khau, saltRounds, (err, hashedPassword) => {
            if (err) {
                return callback(err);
            }

            const sqlInsert = `
                INSERT INTO tai_khoan (
                    ten_nguoi_dung, mat_khau, email, anh_nguoi_dung, sdt
                ) VALUES (?, ?, ?, ?, ?)
            `;
            db.query(sqlInsert, [ten_nguoi_dung, hashedPassword, email, anh_nguoi_dung, sdt], (error, result) => {
                if (error) {
                    return callback(error);
                }
                callback(null, result);
            });
        });
    },
    login: (email, mat_khau, callback) => {
        console.log("Email nhận từ client:", email);
    
        const sqlSelect = `SELECT * FROM tai_khoan WHERE email = ?`;
        db.query(sqlSelect, [email], (error, results) => {
            if (error) {
                console.log("Lỗi khi query:", error);
                return callback(error);
            }
    
            if (results.length === 0) {
                console.log("Tài khoản không tồn tại.");
                return callback(null, { message: "Tài khoản không tồn tại." });
            }
    
            const user = results[0];
            console.log("Tài khoản tìm thấy:", user);
    
            bcrypt.compare(mat_khau, user.mat_khau, (err, isMatch) => {
                if (err) {
                    console.log("Lỗi khi so sánh mật khẩu:", err);
                    return callback(err);
                }
                if (!isMatch) {
                    console.log("Mật khẩu không khớp.");
                    return callback(null, { message: "Mật khẩu không chính xác." });
                }
    
                console.log("Đăng nhập thành công");
                // Nếu mật khẩu đúng, trả về thông tin tài khoản
                callback(null, { message: "Đăng nhập thành công.", user });
            });
        });
    },
    getAll: (callback) => {
        const sqlGet = "SELECT * FROM tai_khoan";
        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    
};

module.exports = Account;

