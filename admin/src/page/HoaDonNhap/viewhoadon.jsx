import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';

export default function Viewhoadonnhap() {
    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };  
    const [chiTiet ,setData] = useState([]);

    const{ma_hoa_don} = useParams();

    useEffect(() => {
        // Thay đổi cách lấy dữ liệu thành một mảng
        axios.get(`http://localhost:5000/api/getcthdn/${ma_hoa_don}`)
            .then((resp) => setData(resp.data))
            .catch((error) => console.error(error));
            
    }, [ma_hoa_don]);
    console.log(chiTiet)
  return (
    <div>
            <div class="card shadow mb-4">
        <div class="d-flex align-items-center justify-content-between card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">Chi tiết đơn hàng nhập</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Hình ảnh</th>
                            <th>Tên sản phẩm</th>
                            <th>Kích cỡ</th>
                            <th>Màu sắc</th>
                            <th>Số lượng</th>
                            <th>Giá</th>

                        </tr>
                    </thead>
                    <tbody>
                        {chiTiet.map((item)=>{
                            return(
                            <tr key={item.ma_chi_tiet_don_hang}>
                                <td><img style={{borderRadius: '5px'}} src={item.anh_san_pham} width='60' height='60' className="img img-responsive" /></td>
                                <td>{item.ten_san_pham}</td>
                                <td>{item.kich_co}</td>
                                <td>{item.mau_sac}</td>
                                <td>{item.so_luong}</td>
                                <td>{formatCurrency(item.don_gia)}</td>
                                
                            </tr>)
                        })}
                        

                    </tbody>

               
                </table>
            </div>
        </div>
    </div>
    </div>
  )
}
