import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
const initiaState = {
  ten_danh_muc :"",
};

export default function Editdm() {

const [state, setState] = useState(initiaState);

const{ten_danh_muc} = state;

const {ma_danh_muc} = useParams();

const  navigate = useNavigate();

useEffect(()=>{
  axios.get(`http://localhost:5000/api/getdm/${ma_danh_muc}`)
  .then((resp) => setState({...resp.data[0]}));
},[ma_danh_muc]);

const handleInputChange = (e) =>{
  const{name, value} = e.target;
  setState({...state,[name]:value});
}

const handleSubmit = (e) => {
  e.preventDefault();

  if(!ten_danh_muc){
    toast.error("Vui lòng nhập đầy đủ thông tin");

  } else{
    if(window.confirm("Bạn có muốn cập nhật thông tin  ?")){
      axios.put(`http://localhost:5000/api/updatedm/${ma_danh_muc}`,{
        ten_danh_muc
      }).then(()=>{
        setState({ten_danh_muc :""})
      }).catch((err) => toast.error(err.response.data));
      toast.success("Sửa danh mục thành công !")
      setTimeout(() => navigate("/Indexdm"),500);
    }
  }
}
  return (
    <div>
          <div>
              <h3 className="mb-0">Thêm danh mục</h3>
              <hr />
              <form onSubmit={handleSubmit} enctype="multipart/form-data">
                  <div className="row mb-3">
                      <div className="col">
                          <input type="text" name="ten_danh_muc" id ="ten_danh_muc" onChange={handleInputChange} value={ten_danh_muc || ""} className="form-control" placeholder="Nhập tên danh mục..."/>
                      </div>
                  </div>

                  <div className="row">
                      <div className="d-grid">
                          <button style={{marginLeft: '10px'}} type="submit" className="btn btn-warning">Cập nhật</button>
                      </div>
                  </div>
                  
              </form>
      
          </div>
    </div>
  )
}
