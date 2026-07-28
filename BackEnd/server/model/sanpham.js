const db = require('../config/config');

const Product = {

    getAll: ({page, pageSize}, callback) => {

        const sqlGet = page ?  `CALL GetProductsByPage(${page}, ${pageSize});` :  "SELECT * FROM san_pham";

        db.query(sqlGet, (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    getById: (ma_san_pham, callback) => {
        const sqlGet = "SELECT * FROM san_pham WHERE ma_san_pham = ?";
        db.query(sqlGet, [ma_san_pham], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    create: (productData, callback) => {
        const {ten_san_pham , gia , size , mau_sac ,anh_sanpham ,ma_danh_muc ,soluong , mo_ta } = productData;
        const sqlInsert = "Insert into san_pham (ten_san_pham , gia,size,mau_sac,anh_sanpham,ma_danh_muc,soluong,mo_ta) values(?,?,?,?,?,?,?,?)";
        db.query(sqlInsert, [ten_san_pham , gia , size , mau_sac ,anh_sanpham ,ma_danh_muc ,soluong , mo_ta], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

    update: (ma_san_pham, productData, callback) => {
        const {ten_san_pham , gia , size , mau_sac ,anh_sanpham ,ma_danh_muc ,soluong , mo_ta } = productData;
        const sqlUpdate = "update san_pham set ten_san_pham = ?, gia = ? ,size = ?, mau_sac = ? ,anh_sanpham = ? ,ma_danh_muc = ? ,soluong= ?, mo_ta = ? where ma_san_pham = ?";
        db.query(sqlUpdate, [ten_san_pham , gia , size , mau_sac ,anh_sanpham ,ma_danh_muc ,soluong , mo_ta, ma_san_pham], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },
    
    delete: (ma_san_pham, callback) => {
        const sqlDelete = "DELETE FROM san_pham WHERE ma_san_pham = ?";
        db.query(sqlDelete, [ma_san_pham], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    },

     searchByName: (searchTerm, callback) => {
        const sqlSearch = "SELECT * FROM san_pham WHERE ten_san_pham LIKE ?";
        const formattedSearchTerm = `%${searchTerm}%`;
        db.query(sqlSearch, [formattedSearchTerm], (error, result) => {
            if (error) {
                return callback(error);
            }
            callback(null, result);
        });
    }
};

module.exports = Product;
