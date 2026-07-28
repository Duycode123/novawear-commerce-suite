const db = require('../config/config');

const Order = {
    addOrder: (orderData, callback) => {
        const { ma_khach_hang, ngay_dat_hang, tong_tien, trang_thai, ten_khach, dia_chi, ghi_chu, sdt, chi_tiet_don_hang } = orderData;
        const insertOrderQuery = `
            INSERT INTO don_hang (ma_khach_hang, ngay_dat_hang, tong_tien, trang_thai, ten_khach, dia_chi, ghi_chu, sdt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.getConnection((err, connection) => {
            if (err) {
                return callback(err);
            }

            connection.beginTransaction((err) => {
                if (err) {
                    connection.release();
                    return callback(err);
                }

                connection.query(
                    insertOrderQuery,
                    [ma_khach_hang, ngay_dat_hang, tong_tien, trang_thai, ten_khach, dia_chi, ghi_chu, sdt],
                    (err, result) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                callback(err);
                            });
                        }

                        const ma_don_hang = result.insertId;
                        const insertOrderDetailsQuery = `
                            INSERT INTO chi_tiet_don_hang (ma_don_hang, ma_san_pham, ten_san_pham, so_luong, gia, kich_co, mau_sac ,anh_sanpham)
                            VALUES ?
                        `;
                        
                        console.log(chi_tiet_don_hang)
                        const orderDetailsValues = chi_tiet_don_hang?.map((item) => [
                            ma_don_hang,
                            item.ma_san_pham,
                            item.ten_san_pham,
                            item.so_luong,
                            item.gia,
                            item.kich_co,
                            item.mau_sac,
                            item.anh_sanpham
                        ]);

                        connection.query(insertOrderDetailsQuery, [orderDetailsValues], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    callback(err);
                                });
                            }

                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        callback(err);
                                    });
                                }

                                connection.release();
                                callback(null, "Thêm đơn hàng thành công");
                            });
                        });
                    }
                );
            });
        });
    }
};

module.exports = Order;
