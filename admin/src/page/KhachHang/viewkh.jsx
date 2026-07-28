import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';

export default function Viewkh() {

  const [khachhang,setData] = useState({});

  const {ma_khach_hang} = useParams();

  useEffect(()=>{
    axios.get(`http://localhost:5000/api/getkh/${ma_khach_hang}`)
    .then((resp) => setData({...resp.data[0]}));
  },[ma_khach_hang]);
  return (
    <div>
      <h3 className="mb-0">Thông tin khách hàng</h3>
        <hr />
        <div className="row">
            <div className="col mb-3">
                <label className="form-label">Mã khách hàng</label>
                <input type="text" name="ma_khach_hang" className="form-control" placeholder="Mã khách hàng" value={khachhang.ma_khach_hang} readonly/>
            </div>
            <div className="col mb-3">
                <label className="form-label">Tên khách hàng</label>
                <input type="text" name="ten_khach_hang" className="form-control" placeholder="Tên khách hàng" value={khachhang.ten_khach_hang} readonly/>
            </div>
        </div>

        <div className="row">
            <div className="col mb-3">
                <label className="form-label">Số điện thoại</label>
                <input type="text" name="so_dien_thoai" className="form-control" placeholder="Số điện thoại" value={ khachhang.so_dien_thoai } readonly/>
            </div>
            <div className="col mb-3">
                <label className="form-label">Email</label>
                <input type="text" name="email" className="form-control" placeholder="Email" value={khachhang.email } readonly/>
            </div>

        </div>
        <div className="row">

            <div className="col mb-3">
                <label className="form-label">Địa chỉ</label>
                <input type="text" name="dia_chi" className="form-control" placeholder="Địa chỉ" value={khachhang.dia_chi } readonly/>
            </div>

        </div>
    </div>
  )
}
