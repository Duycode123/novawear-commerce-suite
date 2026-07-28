import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

  const initiaState = {
    ten_san_pham :"",
    gia:"",
    size:"",
    mau_sac:"",
    anh_sanpham:"",
    ma_danh_muc:"",
    soluong:"",
    mo_ta:"",
};

export default function Editsp() {

  const [state, setState] = useState(initiaState);

  const [file, setFile] = useState(null);

  const{ten_san_pham , gia, size, mau_sac, anh_sanpham, ma_danh_muc ,soluong ,mo_ta } = state;

  const {ma_san_pham} = useParams();

  const navigate = useNavigate();

  console.log(state)

  useEffect(()=>{
    axios.get(`http://localhost:5000/api/getsp/${ma_san_pham}`)
    .then((resp) => setState({...resp.data[0]}));
  },[ma_san_pham]);
  
  const handleInputChange = (e) =>{
    const{name, value} = e.target;
    setState({...state,[name]:value});
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFile(file);
    setState({ ...state, anh_sanpham: `/images/${file.name}` });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
  
    if(!ten_san_pham || !gia ||!size ||!mau_sac ||!anh_sanpham ||!ma_danh_muc||!soluong||!mo_ta){
      toast.error("Vui lòng nhập đầy đủ thông tin");
  
    } else{
      if(window.confirm("Bạn có muốn cập nhật thông tin  ?")){
            
      axios.put(`http://localhost:5000/api/updatesp/${ma_san_pham}`,{
        ten_san_pham , gia, size, mau_sac, anh_sanpham, ma_danh_muc ,soluong, mo_ta
      }).then(()=>{
        setState({ten_san_pham :"",gia:"",size:"",mau_sac:"",anh_sanpham:"", ma_danh_muc:"", soluong:"",mo_ta:""})
      }).catch((err) => toast.error(err.response.data));
      toast.success("Sửa danh mục thành công !")
      setTimeout(() => navigate("/Indexsp"),500);
      }

    }
  }
  return (
    <div>
      <h3 class="mb-0">Cập nhật sản phẩm</h3>
      <hr />
      <form onSubmit={handleSubmit} enctype="multipart/form-data">
          <div class="row">
              <div class="col mb-3">
                  <label class="form-label">Tên sản phẩm</label>
                  <input type="text" name="ten_san_pham" class="form-control" onChange={handleInputChange} placeholder="Tên sản phẩm" value={ten_san_pham || "" }/>
              </div>
              <div class="col mb-3">
                  <label class="form-label">Giá tiền</label>
                  <input type="text" name="gia" class="form-control" onChange={handleInputChange} placeholder="Giá tiền" value={gia || ""} />
              </div>
          </div>
          <div class="row">
              <div class="col mb-3">
                  <label class="form-label">Kích cỡ</label>
                  <input type="text" name="size" class="form-control" onChange={handleInputChange} placeholder="Kích cỡ" value={size || ""} />
              </div>
              <div class="col mb-3">
                  <label class="form-label">Màu sắc</label>
                  <input type="text" name="mau_sac" class="form-control" onChange={handleInputChange} placeholder="Màu sắc" value={mau_sac || ""} />
              </div>

          </div>
          <div class="row">
              <div class="col mb-3">
                  <label class="form-label">Số lượng</label>
                  <input type="text" name="soluong" class="form-control" onChange={handleInputChange} placeholder="Số lượng" value={soluong || ""} />
              </div>
              <div class="col mb-3">
                  <label class="form-label">Mã danh mục</label>
                  <input type="text" name="ma_danh_muc" class="form-control" onChange={handleInputChange} placeholder="Mã danh mục" value={ma_danh_muc || ""} />
              </div>
          </div>
          <div className='row'>
          
              <div class="col mb-3">
                  <label class="form-label">Mô tả</label>
                  <input type="text" name="mo_ta" class="form-control" onChange={handleInputChange} placeholder="Mô tả" value={mo_ta || ""} />
              </div>
          </div>
          <div class="row">
          <img style={{borderRadius: '10px',marginLeft:' 10px'}}  src={anh_sanpham}  width='150' height='180' class="img img-responsive" />
              <div class="col mb-3">
                  <label class="form-label">Ảnh sản phẩm</label>
                  <input type="file" name="anh_sanpham" class="form-control" onChange={handleFileChange} placeholder="Ảnh sản phẩm" readonly/>
              </div>
          </div>
          <div class="row">
              <div class="d-grid">
                  <button style={{marginLeft: '10px', marginTop: '30px'}} class="btn btn-warning">Cập nhật</button>
              </div>
          </div>
      </form>
    </div>
  )
}
