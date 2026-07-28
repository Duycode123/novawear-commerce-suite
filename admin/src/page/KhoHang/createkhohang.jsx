import axios from 'axios';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const initiaState = {
    ma_san_pham:"",
    ten_san_pham: "",
    ngay_san_xuat: "",
    so_luong :"",
    mau_sac :"",
    kich_co:"",
    anh_sanpham:"",
}

export default function Createkhohang() {

    const [state, setState] = useState(initiaState);
  
    const{ma_san_pham ,ten_san_pham,ngay_san_xuat,so_luong,mau_sac ,kich_co,anh_sanpham} = state;
  
    const navigate = useNavigate();

    const handleInputChange = (e) =>{
      const{name, value} = e.target;
      setState({...state,[name]:value});
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setState({ ...state, anh_sanpham: `/images/${file.name}` });
      };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if(!ten_san_pham || !ngay_san_xuat || !so_luong || !mau_sac){
            toast.error("Vui lòng nhập đủ thông tin ")
        } else{
            axios.post("http://localhost:5000/api/createkhohang",{
                ma_san_pham,ten_san_pham,ngay_san_xuat,so_luong,mau_sac,kich_co,anh_sanpham
            }).then(()=> {setState({ma_san_pham:"", ten_san_pham:"",ngay_san_xuat:"",so_luong:"", mau_sac:"",kich_co:""})})
            .catch((err) => toast.error(err.response.data));
            toast.success("Thêm sản phẩm thành công !")
            setTimeout(() => navigate("/Indexkhohang"),500);
        }
    }
  return (
    <div>
      <h3 className="mb-0">Thêm sản phẩm vào kho</h3>
    <hr />
    <form onSubmit={handleSubmit}  enctype="multipart/form-data">
    
        <div className="row mb-3">

            <div className="col">
                <input type="text" name="ma_san_pham" onChange={handleInputChange} value={ma_san_pham} className="form-control" placeholder="Mã sản phẩm"/>
            </div>
            <div className="col">
                <input type="text" name="ten_san_pham" onChange={handleInputChange} value={ten_san_pham} className="form-control" placeholder="Tên sản phẩm "/>
            </div>
            
        </div>
        <div className='row mb-3'>
        <div className="col">
                <input type="file" name="anh_sanpham" onChange={handleFileChange} className="form-control" placeholder="Ảnh sản phẩm"/>
            </div>
        </div>
        <div class="row mb-3">
            <div className="col">
                <input type="text" name="so_luong" onChange={handleInputChange} value={so_luong} className="form-control" placeholder="Số lượng"/>
            </div>
            <div className="col">
                <input type="text" name="mau_sac" onChange={handleInputChange} value={mau_sac} className="form-control" placeholder="Màu sắc"/>
            </div>

        </div>
        <div className='row mb-3'>
        <div className="col">
                <input type="text" name="kich_co" onChange={handleInputChange} value={kich_co} className="form-control" placeholder="Màu sắc"/>
            </div>
            <div class="col">
                <input type="date" name="ngay_san_xuat" onChange={handleInputChange} value={ngay_san_xuat} className="form-control" placeholder="Ngày nhập kho"/>
        </div>
        </div>
        <div class="row">
            <div class="d-grid">
                <button style={{marginLeft: '10px'}} type="submit" class="btn btn-primary">Thêm</button>
            </div>
        </div>
    </form>
    </div>
  )
}
