import axios from 'axios';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const initiaState = {
   ten_nhan_vien:"",
   gioi_tinh:"",
   ngay_sinh:"",
   dia_chi:"",
   sdt:"",
   cmnd:"",
   anh_nhanvien:""
}

export default function Createnv() {

    const [state , setState] = useState(initiaState);

    const{ten_nhan_vien ,gioi_tinh ,dia_chi ,ngay_sinh ,sdt ,cmnd ,anh_nhanvien } = state;

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!ten_nhan_vien || !gioi_tinh || !dia_chi || !ngay_sinh  || !sdt || !cmnd || !anh_nhanvien){
            toast.error("Vui lòng nhập đủ thông tin ")
        } else{
            axios.post("http://localhost:5000/api/createnv",{
                ten_nhan_vien,gioi_tinh,dia_chi,ngay_sinh,sdt,cmnd,anh_nhanvien
            }).then(()=> {setState({ ten_nhan_vien:"",gioi_tinh:"",ngay_sinh:"", dia_chi:"",sdt:"",cmnd:"",anh_nhanvien:""})})
            .catch((err) => toast.error(err.response.data));
            toast.success("Thêm nhân viên thành công  !")
            setTimeout(() => navigate("/Indexnv"),500);
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setState({ ...state, anh_nhanvien: `/images/${file.name}` });
      };

    const handleInputChange = (e) =>{
        const{name,value} = e.target;
        setState({...state,[name]:value});
    }

  return (
    <div>
        <h3 class="mb-0">Thêm nhân viên</h3>
        <hr />
        <form onSubmit={handleSubmit}  enctype="multipart/form-data">
    
            <div class="row mb-3">
                <div class="col">
                    <input type="text" name="ten_nhan_vien" onChange={handleInputChange} value={ten_nhan_vien} class="form-control" placeholder="Tên nhân viên "/>
                </div>
                <div class="col">
                    <input type="text" name="gioi_tinh" onChange={handleInputChange} value={gioi_tinh} class="form-control" placeholder="Giới tính"/>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col">
                    <input type="date" name="ngay_sinh" onChange={handleInputChange} value={ngay_sinh} class="form-control" placeholder="Ngày sinh"/>
                </div>
                <div class="col">
                    <input type="text" name="dia_chi" onChange={handleInputChange} value={dia_chi} class="form-control" placeholder="Địa chỉ"/>
                </div>

            </div>
            <div class="row mb-3">
                <div class="col">
                    <input type="text" name="sdt" onChange={handleInputChange} value={sdt} class="form-control" placeholder="Số điện thoại"/>
                </div>
                <div class="col">
                    <input type="text" class="form-control" name="cmnd" onChange={handleInputChange} value={cmnd} placeholder="Căn cước công dân"/>
                </div>
            </div>
            <div class="row mb-3">

                <div class="col">
                    <input type="file" name="anh_nhanvien" onChange={handleFileChange} class="form-control" placeholder="Ảnh nhân viên"/>
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
