import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
const initiaState = {
    ten_san_pham: "",
    ngay_san_xuat: "",
    so_luong :"",
    mau_sac :"",
    kich_co:"",
    anh_sanpham:""
}
export default function Editkhohang() {
    const [state, setState] = useState(initiaState);
    const [file, setFile] = useState(null);
  
    const{ten_san_pham,ngay_san_xuat,so_luong,mau_sac,kich_co,anh_sanpham } = state;
  
    const {ma_kho_hang} = useParams();
  
    const navigate = useNavigate();
  
    useEffect(()=>{
      axios.get(`http://localhost:5000/api/getkhohang/${ma_kho_hang}`)
      .then((resp) => setState({...resp.data[0]}));
      console.log(state)
    },[ma_kho_hang]);
    
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
        if(!ten_san_pham || !ngay_san_xuat || !so_luong || !mau_sac){
            toast.error("Vui lòng nhập đủ thông tin ")
        } else{
            if(window.confirm("Bạn có muốn cập nhật thông tin  ?")){
                axios.put(`http://localhost:5000/api/updatekhohang/${ma_kho_hang}`,{
                    ten_san_pham,ngay_san_xuat,so_luong,mau_sac,kich_co,anh_sanpham
                }).then(()=> {setState({ ten_san_pham:"",ngay_san_xuat:"",so_luong:"", mau_sac:"",kich_co:"",anh_sanpham:""})})
                .catch((err) => toast.error(err.response.data));
                toast.success("Sửa sản phẩm thành công !")
                setTimeout(() => navigate("/Indexkhohang"),500);
            }
        }
    }
  return (
    <div>
      <h1 class="mb-0">Cập nhật kho hàng</h1>
    <hr />
    <form onSubmit={handleSubmit}  enctype="multipart/form-data" >
        <div class="row">
            <div class="col mb-3">
                <label class="form-label">Tên sản phẩm</label>
                <input type="text" name="ten_san_pham" class="form-control" placeholder="Tên sản phẩm" onChange={handleInputChange} value={ten_san_pham || "" } />
            </div>
            <div class="col mb-3">
                <label class="form-label">Ngày nhập kho</label>
                <input type="date" name="ngay_san_xuat" class="form-control" placeholder="Ngày nhập kho" onChange={handleInputChange} value={ngay_san_xuat || "" } />
            </div>
        </div>
        <div class="row">
            <div class="col mb-3">
                <label class="form-label">Số lượng</label>
                <input type="text" name="so_luong" class="form-control" placeholder="Màu sắc" onChange={handleInputChange} value={so_luong || "" } />
            </div>
            <div class="col mb-3">
                <label class="form-label">Màu sắc</label>
                <input type="text" name="mau_sac" class="form-control" placeholder="Màu sắc" onChange={handleInputChange} value={mau_sac || "" } />
            </div>

        </div>
        <div class="row">
            <div class="col mb-3">
                <label class="form-label">Kích cỡ</label>
                <input type="text" name="kich_co" class="form-control" placeholder="Màu sắc" onChange={handleInputChange} value={kich_co || "" } />
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
