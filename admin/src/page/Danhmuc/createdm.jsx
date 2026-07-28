import React, { useState } from 'react';
import {Link ,useParams} from 'react-router-dom';
import axios from 'axios';
import {toast} from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const initiaState = {
  ten_danh_muc :"",
};

export default function Createdm() {
  const [state, setState] = useState(initiaState);

  const{ten_danh_muc} = state;

  const  navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if(!ten_danh_muc){
      toast.error("Vui lòng nhập đầy đủ thông tin");

    } else{
      axios.post("http://localhost:5000/api/createdm",{
        ten_danh_muc
      }).then(()=>{setState({ten_danh_muc :""})
      
      }).catch((err) => toast.error(err.response.data));
      toast.success("Thêm danh mục thành công !")
      setTimeout(() => navigate("/Indexdm"),500);
    }
   
  }

  const handleInputChange = (e) =>{
    const{name, value} = e.target;
    setState({...state,[name]:value});
  }


  return (
    <div>
      <h3 className="mb-0">Thêm danh mục</h3>
      <hr />
      <form onSubmit={handleSubmit} enctype="multipart/form-data">
          <div className="row mb-3">
              <div className="col">
                  <input type="text" name="ten_danh_muc" id ="ten_danh_muc" onChange={handleInputChange} value={ten_danh_muc} className="form-control" placeholder="Nhập tên danh mục..."/>
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
