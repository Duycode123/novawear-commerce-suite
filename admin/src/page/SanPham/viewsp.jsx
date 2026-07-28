import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
export default function Viewsp() {

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };  
    const [sanpham ,setData] = useState({});

    const{ma_san_pham} = useParams();

    useEffect(()=>{
        axios.get(`http://localhost:5000/api/getsp/${ma_san_pham}`)
        .then((resp) => setData({...resp.data[0]}));
    },[ma_san_pham]);

  return (
    <div>
      <h3  class="mb-0">Thông tin : {sanpham.ten_san_pham}</h3>
    <hr/>

    <div  class="row">
    <img style={{borderRadius: '10px', marginLeft: '10px'}}  src={sanpham.anh_sanpham}  width='150' height='180' class="img img-responsive" />
    <div class="row-1">
        <div class="col mb-3">
            <label class="form-label">Mã sản phẩm</label>
            <input type="text" name="ma_danh_muc" class="form-control" placeholder="Mã sản phẩm" value={ma_san_pham } readonly/>
        </div>
        <div class="col mb-3">
            <label class="form-label">Mã danh mục</label>
            <input type="text" name="ma_danh_muc" class="form-control" placeholder="Mã danh mục" value={sanpham.ma_danh_muc} readonly/>
        </div>
    </div>
    </div>

    <hr />

    <div class="row">
    <div class="col mb-3">
            <label class="form-label">Giá</label>
            <input type="text" name="gia" class="form-control" placeholder="Giá" value={formatCurrency(sanpham.gia)}  readonly/>
        </div>
    <div class="col mb-3">
            <label class="form-label">Số lượng</label>
            <input type="text" name="soluong" class="form-control" placeholder="Số lượng" value={sanpham.soluong } readonly/>
        </div>

    </div>
    <div class="row">
        <div class="col mb-3">
            <label class="form-label">Màu sắc</label>
            <input type="text" name="mau_sac" class="form-control" placeholder="Màu sắc" value={sanpham.mau_sac} readonly/>
        </div>
        <div class="col mb-3">
            <label class="form-label">Kích cỡ</label>
            <input type="text" name="size" class="form-control" placeholder="Kích cỡ" value={sanpham.size } readonly/>
        </div>

    </div>
    <div class="row">
        <div class="col mb-3">
            <label class="form-label">Mô tả</label>
            <textarea class="form-control" name="mo_ta" placeholder="Mô tả" value={sanpham.mo_ta} readonly></textarea>
        </div>

    </div>
    </div>
  )
}
