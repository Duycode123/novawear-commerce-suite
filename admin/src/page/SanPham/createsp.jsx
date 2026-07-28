import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const initiaState = {
    ten_san_pham :"",
    gia:"",
    size:"",
    mau_sac:"",
    anh_sanpham:"",
    ma_danh_muc:"",
    soluong:"",
    mo_ta:""
}

export default function Createsp() {

    const [state , setState] = useState(initiaState);

    const{ten_san_pham , gia,size,mau_sac,anh_sanpham,ma_danh_muc,soluong,mo_ta} = state;

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!ten_san_pham || !gia ||!size ||!mau_sac ||!anh_sanpham ||!ma_danh_muc||!soluong||!mo_ta){
            toast.error("Vui lòng nhập đủ thông tin ")
        } else{
            axios.post("http://localhost:5000/api/createsp",{
                ten_san_pham , gia, size, mau_sac, anh_sanpham, ma_danh_muc ,soluong, mo_ta
            }).then(()=> {setState({ ten_san_pham :"",gia:"",size:"",mau_sac:"",anh_sanpham:"", ma_danh_muc:"", soluong:"",mo_ta:""})})
            .catch((err) => toast.error(err.response.data));
            toast.success("Thêm sản phẩm thành công !")
            setTimeout(() => navigate("/Indexsp"),500);
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setState({ ...state, anh_sanpham: `/images/${file.name}` });
      };

    const handleInputChange = (e) =>{
        const{name,value} = e.target;
        setState({...state,[name]:value});
    }

    
  return (
    <div>
    <h3 className="mb-0">Thêm sản phẩm</h3>
    <hr />
    <form onSubmit={handleSubmit} enctype="multipart/form-data">
      
        <div className="row mb-3">
            <div className="col">
                <input type="text" name="ten_san_pham" onChange={handleInputChange} value={ten_san_pham} className="form-control" placeholder="Tên sản phẩm "/>
            </div>
            <div className="col">
                <input type="text" name="gia" onChange={handleInputChange} value={gia} className="form-control" placeholder="Giá"/>
            </div>
        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="text" name="size" onChange={handleInputChange} value={size} className="form-control" placeholder="Kích cỡ"/>
            </div>
            <div className="col">
                <input type="text" name="mau_sac" onChange={handleInputChange} value={mau_sac} className="form-control" placeholder="Màu sắc"/>
            </div>

        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="file" name="anh_sanpham" onChange={handleFileChange} className="form-control" placeholder="Ảnh sản phẩm"/>
            </div>
            <div className="col">
                <input type="text" onChange={handleInputChange} value={ma_danh_muc} className="form-control" name="ma_danh_muc" placeholder="Mã danh mục"/>
            </div>
        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="text" onChange={handleInputChange} value={soluong} name="soluong" className="form-control" placeholder="Số lượng"/>
            </div>
            <div className="col">
            <textarea name="mo_ta"onChange={handleInputChange} value={mo_ta}  className="form-control" placeholder="Mô tả"></textarea>
            </div>
            
        </div>

        <div className="row">
            <div className="d-grid">
                <button style={{marginLeft: '10px'}} type="submit" className="btn btn-primary">Thêm</button>
            </div>
        </div>
    </form>
  </div>
  )
}
