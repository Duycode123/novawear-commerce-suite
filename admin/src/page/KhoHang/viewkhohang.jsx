import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';

export default function Viewkhohang() {
    const[khohang,setData] = useState({});

    const {ma_kho_hang} = useParams();
  
    useEffect(()=>{
      axios.get(`http://localhost:5000/api/getkhohang/${ma_kho_hang}`)
      .then((resq)=> setData({...resq.data[0]}));
    },[ma_kho_hang]);

  return (
    <div>
        <h3 class="mb-0">Thông tin kho hàng</h3>
    <hr />
    <div className='row'>
    <img style={{borderRadius: '10px', marginLeft: '10px'}}  src={khohang.anh_sanpham}  width='150' height='180' class="img img-responsive" />
    </div>
    <div class="row">
        <div class="col mb-3">
            <label class="form-label">Mã sản phẩm</label>
            <input type="text" name="ma_san_pham" class="form-control" placeholder="Mã sản phẩm" value={khohang.ma_san_pham} readonly/>
        </div>
        <div class="col mb-3">
            <label class="form-label">Tên sản phẩm</label>
            <input type="text" name="ten_san_pham" class="form-control" placeholder="Tên sản phẩm" value={khohang.ten_san_pham} readonly/>
        </div>
    </div>

    <div class="row">
        <div class="col mb-3">
            <label class="form-label">Số lượng</label>
            <input type="text" name="so_luong" class="form-control" placeholder="Số lượng" value={ khohang.so_luong } readonly/>
        </div>
        <div class="col mb-3">
            <label class="form-label">Ngày nhập kho</label>
            <input type="text" name="ngay_san_xuat" class="form-control" placeholder="Ngày nhập kho" value={khohang.ngay_san_xuat } readonly/>
        </div>

    </div>
    <div class="row">
        <div class="col mb-3">
            <label class="form-label">Màu sắc</label>
            <input type="text" name="mau_sac" class="form-control" placeholder="Màu sắc" value={khohang.mau_sac } readonly/>
        </div>
        <div class="col mb-3">
            <label class="form-label">Kích cx</label>
            <input type="text" name="kich_co" class="form-control" placeholder="Màu sắc" value={khohang.kich_co } readonly/>
        </div>
    </div>
    </div>
  )
}
