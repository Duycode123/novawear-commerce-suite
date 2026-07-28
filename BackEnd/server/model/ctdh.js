const db = require('../config/config');

const BillCT = {

    getById: (ma_don_hang, callback) => {
        const sqlGet = "SELECT * FROM chi_tiet_don_hang WHERE ma_don_hang = ?";
        db.query(sqlGet, [ma_don_hang], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    getTop5ProductsDetails: (callback) => {
        const sql = `
            SELECT sp.*, ctdh.ma_san_pham, SUM(ctdh.so_luong) AS total_quantity
            FROM chi_tiet_don_hang ctdh
            INNER JOIN san_pham sp ON ctdh.ma_san_pham = sp.ma_san_pham
            GROUP BY ctdh.ma_san_pham, sp.ma_san_pham
            ORDER BY total_quantity DESC
            LIMIT 5
        `;

        db.query(sql, (error, results) => {
            if (error) {
                return callback(error, null);
            }
            callback(null, results);
        });
    },

    getDetailsByCustomerId :(ma_khach_hang, callback) => {
        // Truy vấn để lấy danh sách đơn hàng của khách hàng
        const sqlGetOrders = `
            SELECT ma_don_hang, ten_khach, sdt, dia_chi,trang_thai
            FROM don_hang
            WHERE ma_khach_hang = ?
        `;
    
        db.query(sqlGetOrders, [ma_khach_hang], (error, orders) => {
            if (error) {
                return callback(error);
            }
    
            if (orders.length === 0) {
                return callback(null, []); // Không có đơn hàng nào cho khách hàng này
            }
    
            const orderDetailsPromises = orders.map(order => {
                const sqlGetOrderDetails = `
                    SELECT *
                    FROM chi_tiet_don_hang
                    WHERE ma_don_hang = ?
                `;
    
                return new Promise((resolve, reject) => {
                    db.query(sqlGetOrderDetails, [order.ma_don_hang], (error, orderDetails) => {
                        if (error) {
                            return reject(error);
                        }
    
                        resolve({
                            trang_thai:order.trang_thai,
                            ma_don_hang: order.ma_don_hang,
                            ten_khach: order.ten_khach,
                            sdt: order.sdt,
                            dia_chi: order.dia_chi,
                            orderDetails: orderDetails
                        });
                    });
                });
            });
    
            // Chờ tất cả các promise hoàn thành
            Promise.all(orderDetailsPromises)
                .then(results => callback(null, results))
                .catch(error => callback(error));
        });
    }
    

};

module.exports = BillCT;