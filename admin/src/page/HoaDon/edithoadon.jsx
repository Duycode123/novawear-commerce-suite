import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

  const initiaState = {
    ten_khach :"",
    ngay_dat_hang:"",
    tong_tien:"",
    trang_thai:"",
    dia_chi:"",
    ghi_chu:"",
    sdt:"",
};

export default function EditHD() {

  const [state, setState] = useState(initiaState);


  const{ten_khach , ngay_dat_hang, tong_tien, trang_thai, dia_chi ,ghi_chu ,sdt } = state;

  const {ma_don_hang} = useParams();

  const navigate = useNavigate();


  useEffect(()=>{
    axios.get(`http://localhost:5000/api/gethd/${ma_don_hang}`)
    .then((resp) => setState({...resp.data[0]}));
  },[ma_don_hang]);
  
  const handleInputChange = (e) =>{
    const{name, value} = e.target;
    setState({...state,[name]:value});
  }
  
  const handleSubmit = (e) => {
    e.preventDefault();
  
    if(!trang_thai){
      toast.error("Vui lòng nhập đầy đủ thông tin");
  
    } else{
      if(window.confirm("Bạn có muốn cập nhật thông tin  ?")){
            
      axios.put(`http://localhost:5000/api/updatehd/${ma_don_hang}`,{
       trang_thai
      }).then(()=>{
        setState({trang_thai:""})
      }).catch((err) => toast.error(err.response.data));
      toast.success("Sửa hóa đơn thành công !")
      setTimeout(() => navigate("/Indexhd"),500);
      }

    }
  }
  return (
    <div>
      <h3 class="mb-0">Cập nhật đơn hàng</h3>
      <hr />
      <form onSubmit={handleSubmit} enctype="multipart/form-data">
          <div class="row">
              <div class="col mb-3">
                  <label class="form-label">Tên khách hàng</label>
                  <input type="text" name="ten_khach" class="form-control" onChange={handleInputChange} placeholder="Tên khách hàng" value={ten_khach || "" }/>
              </div>
              <div class="col mb-3">
                  <label class="form-label">Số điện thoại</label>
                  <input type="text" name="sdt" class="form-control" onChange={handleInputChange} placeholder="Số điện thoại" value={sdt || ""} />
              </div>
          </div>
          <div class="row">
              <div class="col mb-3">
                  <label class="form-label">Ngày đặt hàng</label>
                  <input type="text" name="ngay_dat_hang" class="form-control" onChange={handleInputChange} placeholder="Ngày đặt hàng" value={ngay_dat_hang?.slice(0, 10) || ""} />
              </div>
              <div class="col mb-3">
              <select
                style={{ marginTop: '31px'}}
                name="trang_thai"
                className="form-control"
                onChange={handleInputChange}
                value={trang_thai}
              >
                <option value="2">Đã Duyệt</option>
                <option value="1">Chưa Duyệt</option>
              </select>
              </div>
          </div>
          <div class="row">
              <div class="col mb-3">
                  <label class="form-label">Địa chỉ</label>
                  <input type="text" name="soluong" class="form-control" onChange={handleInputChange} placeholder="Địa chỉ" value={dia_chi || ""} />
              </div>
              <div class="col mb-3">
                  <label class="form-label">Tổng tiền</label>
                  <input type="text" name="ma_danh_muc" class="form-control" onChange={handleInputChange} placeholder="Tổng tiền" value={tong_tien || ""} />
              </div>
          </div>
          <div className='row'>
          
              <div class="col mb-3">
                  <label class="form-label">Mô tả</label>
                  <input type="text" name="ghi_chu" class="form-control" onChange={handleInputChange} placeholder="Ghi chú" value={ghi_chu || ""} />
              </div>
          </div>
          <div class="row">
              <div class="d-grid">
                  <button style={{marginLeft: '10px', marginTop: '30px'}} class="btn btn-warning">Cập nhật</button>
              </div>
              <div class="d-grid">
                  <button style={{marginLeft: '10px', marginTop: '30px'}} class="btn btn-warning">In Đơn </button>
              </div>
          </div>
      </form>
    </div>
  )
}
