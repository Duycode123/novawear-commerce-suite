const jwt = require('jsonwebtoken');
const Account = require('../model/taikhoan');

exports.loginAccount = (req, res) => {
    const { email, mat_khau } = req.body;

    if (!email || !mat_khau) {
        return res.status(400).json({ message: "Vui lòng nhập đầy đủ email và mật khẩu." });
    }

    Account.login(email, mat_khau, (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Đã xảy ra lỗi." });
        }

        if (result.message && result.message !== "Đăng nhập thành công.") {
            return res.status(400).json(result);
        }

        // Nếu đăng nhập thành công, tạo token
        const user = result.user;
        const secretKey = String(process.env.JWT_SECRET || "");
        if (Buffer.byteLength(secretKey, "utf8") < 32) {
            return res.status(503).json({
                message: "Máy chủ chưa được cấu hình khóa đăng nhập an toàn.",
            });
        }
        const token = jwt.sign(
            {
                id_tai_khoan: user.id_tai_khoan,
                ten_nguoi_dung: user.ten_nguoi_dung,
                email: user.email,
            },
            secretKey,
            { expiresIn: '1h' } // Thời gian hết hạn của token là 1 giờ
        );

        // Trả về token cùng với thông tin người dùng
        res.status(200).json({
            message: "Đăng nhập thành công.",
            token: token,
            user: {
                id_tai_khoan: user.id_tai_khoan,
                ten_nguoi_dung: user.ten_nguoi_dung,
                email: user.email,
            },
        });
    });
};

exports.createAccount = (req, res) => {
    const accountData = req.body;
    Account.create(accountData, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send("Tài khoản được tạo thành công");
    });
};

exports.getAllAccount = (req, res) => {
    Account.getAll((err, result) => {
        if (err) {
            return res.status(500).send(err);
        }
        res.send(result);
    });
};



