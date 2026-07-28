import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function Viewdm() {
  const[danhmuc ,setData] = useState({});

  const {ma_danh_muc} = useParams();

  useEffect(()=>{
    axios.get(`http://localhost:5000/api/getdm/${ma_danh_muc}`)
    .then((resp) => setData({...resp.data[0]}));
  },[ma_danh_muc]);

  return (
    <div>
      <h3 className="mb-0">Thông tin danh mục</h3>
      <hr />
      <div className="row">
        <div className="col mb-3">
          <label className="form-label">Mã danh mục</label>
          <input
            type="text"
            name="ma_danh_muc"
            className="form-control"
            placeholder="Mã danh mục"
            value={ma_danh_muc}
            readonly
          />
        </div>
        <div className="col mb-3">
          <label className="form-label">Tên danh mục</label>
          <input
            type="text"
            name="ten_danh_muc"
            className="form-control"
            placeholder="Tên danh mục"
            value={danhmuc.ten_danh_muc}
            readonly
          />
        </div>
      </div>
    </div>
  );
}
