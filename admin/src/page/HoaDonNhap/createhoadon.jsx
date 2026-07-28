import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const initiaState = {
    ngay_nhap :"",
    tong_tien:"",
    ten_ncc:"",
    sdt:"",
    ma_nhan_vien:"",
    email:"",
    dia_chi:""
}

export default function Createhdn() {

    const [state , setState] = useState(initiaState);

    const{ngay_nhap,tong_tien,ten_ncc,sdt,ma_nhan_vien,email,dia_chi} = state;

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!ngay_nhap || !tong_tien ||!ten_ncc ||!sdt ||!ma_nhan_vien ||!email||!dia_chi){
            toast.error("Vui lòng nhập đủ thông tin ")
        } else{
            axios.post("http://localhost:5000/api/createhdn",{
                ngay_nhap,tong_tien,ten_ncc,sdt,ma_nhan_vien,email,dia_chi
            }).then(()=> {setState({ ngay_nhap :"",tong_tien:"",sdt:"",ma_nhan_vien:"",email:"", dia_chi:""})})
            .catch((err) => toast.error(err.response.data));
            toast.success("Thêm hóa đơn thành công !")
            setTimeout(() => navigate("/Indexhdn"),500);
        }
    }

    const handleInputChange = (e) =>{
        const{name,value} = e.target;
        setState({...state,[name]:value});
    }

    
  return (
    <div>
    <h3 className="mb-0">Hóa đơn</h3>
    <hr />
    <form onSubmit={handleSubmit} enctype="multipart/form-data">
      
        <div className="row mb-3">
            <div className="col">
                <input type="text" name="ten_ncc" onChange={handleInputChange} value={ten_ncc} className="form-control" placeholder="Tên nhà cung cấp "/>
            </div>
            <div className="col">
                <input type="text" name="email" onChange={handleInputChange} value={email} className="form-control" placeholder="Email"/>
            </div>
        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="text" name="ma_nhan_vien" onChange={handleInputChange} value={ma_nhan_vien} className="form-control" placeholder="Mã nhân viên"/>
            </div>
            <div className="col">
                <input type="text" name="sdt" onChange={handleInputChange} value={sdt} className="form-control" placeholder="Số điện thoại"/>
            </div>

        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="date" onChange={handleInputChange} value={ngay_nhap} name="ngay_nhap" className="form-control" placeholder="Ngày nhập"/>
            </div>
            <div className="col">
            <input name="tong_tien"onChange={handleInputChange} value={tong_tien}  className="form-control" placeholder="Tổng tiền"></input>
            </div>
            
        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="text" onChange={handleInputChange} value={dia_chi} name="dia_chi" className="form-control" placeholder="Địa chỉ"/>
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
