import React, { Fragment, useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '../../until/userContext';

// Loading component
const Loading = () => (
    <div className="loading">
        <p>Đang tải dữ liệu...</p>
    </div>
);

// Error component
const Error = ({ message }) => (
    <div className="error">
        <p style={{ color: 'red' }}>{message}</p>
    </div>
);

// Main component
export default function OrderCart() {
    const { user } = useUser();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load data from API
    const loadData = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/orderDetailsByCustomer/${user.id}`);
            setOrders(response.data);
            setLoading(false);
        } catch (error) {
            setError('Hiện chưa có đơn hàng nào!');
            setLoading(false);
        }
    };

    // Format currency
    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };

    // Use effect to load data on component mount
    useEffect(() => {
        loadData();
    }, []);

    return (
        <Fragment>
            <div className="container-cart">
                <h2>Thông tin đơn hàng</h2>
                
                {loading ? (
                    <Loading />
                ) : error ? (
                    <Error message={error} />
                ) : (
                    <div className='layout-order'>
                        {orders.map((order) => (
                            <div key={order.ma_don_hang} className="order-section">
                                <div className="address-details">
                                    <h3><i className="fas fa-map-marker-alt"></i> Địa chỉ nhận hàng</h3>
                                    <div className="address-item">
                                        <label>Tên người nhận:</label>
                                        <span>{order.ten_khach}</span>
                                    </div>
                                    <div className="address-item">
                                        <label>Số điện thoại:</label>
                                        <span>{order.sdt}</span>
                                    </div>
                                    <div className="address-item">
                                        <label>Địa chỉ chi tiết:</label>
                                        <span>{order.dia_chi}</span>
                                    </div>
                                    <div className="address-item">
                                        <label>Trạng thái:</label>
                                        <span>{parseInt(order.trang_thai) === 1 ? "Đang đợi xác nhận" : "Người gửi đang chuẩn bị sản phẩm"}</span>
                                    </div>
                                </div>
                                
                                <div className="product-table">
                                    {order.orderDetails.length > 0 ? (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Tên Sản Phẩm</th>
                                                    <th>Ảnh Sản Phẩm</th>
                                                    <th>Số Lượng</th>
                                                    <th>Kích Cỡ</th>
                                                    <th>Màu Sắc</th>
                                                    <th>Thành Tiền</th>
                                                    <th>Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.orderDetails.map((item) => (
                                                    <tr key={item.ma_chi_tiet_don_hang}>
                                                        <td className="table-cart-1">{item.ten_san_pham}</td>
                                                        <td>
                                                            <img 
                                                                src={item.anh_sanpham} 
                                                                className="product-image" 
                                                                alt="Product" 
                                                                loading="lazy" // Lazy load image
                                                            />
                                                        </td>
                                                        <td>{item.so_luong}</td>
                                                        <td>{item.kich_co}</td>
                                                        <td>{item.mau_sac}</td>
                                                        <td>{formatCurrency(item.gia)}</td>
                                                        <td><i className="fas fa-pen"></i></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="no-orders">
                                            <p>Không có đơn hàng nào được tìm thấy.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Fragment>
    );
}
