import axios from 'axios';
import React, { useEffect, useState } from 'react'

export default function TaiKhoan() {
  const [data,setData] = useState([]);

  const loadData = async() =>{
      const response = await axios.get("http://localhost:5000/api/getallaccount");
      setData(response.data);
  };

  const handleSearch = async (e) => {
    const searchTerm = e.target.value;
    if (!searchTerm) {
        loadData();
    } else {
        try {
            const response = await axios.get(`http://localhost:5000/api/searchtk/${searchTerm}`);
            setData(response.data);
        } catch (error) {
            console.error("Error searching data", error);
        }
    }
};


  useEffect(()=>{
      loadData();
  },[]);
  return (
    <div>
        <div class="card shadow mb-4">
        <div class="d-flex align-items-center justify-content-between card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">Dữ Liệu Tài Khoản</h6>
            <a href="" class="btn btn-primary">Thêm tài khoản</a>
        </div>
        <div className="d-flex align-items-center  card-header ">
            <form className="d-none d-sm-inline-block form-inline mr-auto my-2 my-md-0 mw-100 navbar-search">
                    <div className="input-group">
                        <label htmlFor="">Tìm kiếm :</label>
                        <input style={{marginLeft:'5px'}}type="text" onChange={handleSearch} className="form-control form-control-sm" placeholder="nhập dữ liệu tìm kiếm" aria-label="Search" aria-describedby="basic-addon2"/>
                    </div>
                </form>
            </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên đăng nhập</th>
                            <th>Mật khẩu</th>
                            <th>Loại tài khoản</th>
                            <th>Chi tiết</th>
                            <th>Sửa</th>
                            <th>Xóa</th>

                        </tr>
                    </thead>

                    <tbody>
                      {data.map((item,index)=>{
                        return(
                        <tr key={item.id}>
                          <td>{index+1}</td>
                          <td>{item.email}</td>
                          <td>{item.password}</td>
                          <td>{item.is_admin === 0 ? "user" : "admin"}</td>
                          <td><a href="" type="button" class="btn btn-primary">Chi Tiết</a></td>
                          <td><a href="" class="btn btn-warning">Sửa</a></td>
                          <td>
                                  <button type='submit' onclick="deleteConfirm(event)" class='btn btn-danger'>Xóa</button>
                          </td>
                      </tr>)
                      })}
                        
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    </div>
  )
}
