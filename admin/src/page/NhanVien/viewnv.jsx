import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';

export default function Viewnv() {

  const[nhanvien,setData] = useState({});

  const {ma_nhan_vien} = useParams();

  useEffect(()=>{
    axios.get(`http://localhost:5000/api/getnv/${ma_nhan_vien}`)
    .then((resq)=> setData({...resq.data[0]}));
  },[ma_nhan_vien]);
  
  return (
    <div>
      <h3 class="mb-0">Thông tin nhân viên</h3>
      <hr />
      <div class="row">
        <div class="col mb-3">
              <label class="form-label">Mã nhân viên</label>
              <input type="text" name="ma_nhan_vien" class="form-control" placeholder="Mã nhân viên" value={nhanvien.ma_nhan_vien} readonly/>
          </div>
          <div class="col mb-3">
              <label class="form-label">Tên nhân viên</label>
              <input type="text" name="ten_nhan_vien" class="form-control" placeholder="Tên nhân viên" value={nhanvien.ten_nhan_vien} readonly/>
          </div>
      </div>

      <div class="row">
          <div class="col mb-3">
              <label class="form-label">Giới tính</label>
              <input type="text" name="gioi_tinh" class="form-control" placeholder="Giới tính" value={nhanvien.gioi_tinh } readonly/>
          </div>
          <div class="col mb-3">
              <label class="form-label">Ngày sinh</label>
              <input type="text" name="ngay_sinh" class="form-control" placeholder="Ngày sinh" value={nhanvien.ngay_sinh } readonly/>
          </div>
      </div>
      <div class="row">
          <div class="col mb-3">
              <label class="form-label">Địa chỉ</label>
              <input type="text" name="dia_chi" class="form-control" placeholder="Địa chỉ" value={nhanvien.dia_chi } readonly/>
          </div>
          <div class="col mb-3">
              <label class="form-label">Số điện thoại</label>
              <input type="text" name="sdt" class="form-control" placeholder="Số điện thoại" value={nhanvien.sdt } readonly/>
          </div>

      </div>
      <div class="row">
          <div class="col mb-3">
              <label class="form-label">Căn cước công dân</label>
              <input type="text" name="cmnd" class="form-control" placeholder="Created At" value={nhanvien.cmnd } readonly/>
          </div>
          
      </div>
      <div class="row">
          <div class="col mb-3">
              <label class="form-label">Ảnh nhân viên</label>
              <input type="text" name="anh_nhanvien" class="form-control" placeholder="Created At" value={nhanvien.anh_nhanvien } readonly/>
          </div>
          
      </div>
    </div>
  )
}
