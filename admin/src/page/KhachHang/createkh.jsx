import axios from 'axios';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
const initiaState = {
     ten_khach_hang:"",
     email:"",
     so_dien_thoai:"",
     dia_chi:""
  };
export default function Createkh() {
    const [state, setState] = useState(initiaState);

    const{ten_khach_hang , email ,so_dien_thoai ,dia_chi} = state;

    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
    
        if(!ten_khach_hang || !email || !so_dien_thoai || !dia_chi){
          toast.error("Vui lòng nhập đầy đủ thông tin");
    
        } else{
          axios.post("http://localhost:5000/api/createkh",{
            ten_khach_hang , email ,so_dien_thoai ,dia_chi
          }).then(()=>{setState({ten_khach_hang:"",email:"",so_dien_thoai:"", email:""})
          
          }).catch((err) => toast.error(err.response.data));
          toast.success("Thêm khách hàng thành công  !")
          setTimeout(() => navigate("/Indexkh"),500);
        }
       
      }
    
      const handleInputChange = (e) =>{
        const{name, value} = e.target;
        setState({...state,[name]:value});
      }

  return (
   <div>
    <h3 className="mb-0">Thêm khách hàng</h3>
    <hr />
    <form onSubmit={handleSubmit}  enctype="multipart/form-data">
        <div className="row mb-3">
            <div className="col">
                <input type="text" name="ten_khach_hang" onChange={handleInputChange} value={ten_khach_hang}  className="form-control" placeholder="Tên khách hàng "/>
            </div>
            <div className="col">
                <input type="text" name="email" onChange={handleInputChange} value={email}  className="form-control" placeholder="Email"/>
            </div>
        </div>
        <div className="row mb-3">
            <div className="col">
                <input type="text" name="so_dien_thoai" onChange={handleInputChange} value={so_dien_thoai}  className="form-control" placeholder="Số điện thoại"/>
            </div>
            <div className="col">
                <input type="text" name="dia_chi" onChange={handleInputChange} value={dia_chi}  className="form-control" placeholder="Địa chỉ"/>
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
