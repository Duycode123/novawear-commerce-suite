import React, { Fragment, useEffect, useState } from 'react';
import axios from "axios"; 
import{toast , Flip} from "react-toastify"
import { Link } from 'react-router-dom';

export default function Indexdm() {

        const [data , setData] = useState([]);

        const loadData = async() =>{
                const response = await axios.get("http://localhost:5000/api/getalldm");
                setData(response.data);
        };

        useEffect(()=>{
            loadData();
        },[]);

        const handleSearch = async (e) => {
            const searchTerm = e.target.value;
            if (!searchTerm) {
                loadData();
            } else {
                try {
                    const response = await axios.get(`http://localhost:5000/api/searchdm/${searchTerm}`);
                    setData(response.data);
                } catch (error) {
                    console.error("Error searching data", error);
                }
            }
        };

        const deleteDM = (ma_danh_muc) =>{
            if(window.confirm("Bạn có muốn xóa danh mục này không ?")){
                axios.delete(`http://localhost:5000/api/deletedm/${ma_danh_muc}`);
                toast.success('Xóa danh mục thành công !', {
                    position: "top-right",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                    transition: Flip,
                    });
                setTimeout(()=>loadData(),500);
            }
        }
  return (

    <Fragment>
    <div className="card shadow mb-4">
            <div className="d-flex align-items-center justify-content-between card-header py-3">
                <h6 className="m-0 font-weight-bold text-primary">Dữ Liệu Danh Mục</h6>
                <Link to="/Themdm" className="btn btn-primary">Thêm danh mục</Link>
            </div>
            <div className="d-flex align-items-center  card-header ">
            <form className="d-none d-sm-inline-block form-inline mr-auto my-2 my-md-0 mw-100 navbar-search">
                    <div className="input-group">
                        <label htmlFor="">Tìm kiếm :</label>
                        <input style={{marginLeft:'5px'}}type="text" onChange={handleSearch} className="form-control form-control-sm" placeholder="nhập dữ liệu tìm kiếm" aria-label="Search" aria-describedby="basic-addon2"/>
                    </div>
                </form>
            </div>
            
            <div className="card-body">
                <div className="table-responsive">
                    <table className="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Tên Danh Mục</th>
                                <th>Chi Tiết</th>
                                <th>Sửa</th>
                                <th>Xóa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item,index)=>{
                                return(
                                    
                                <tr key={item.ma_danh_muc}>
                                    <td>{index+1}</td>
                                    <td>{item.ten_danh_muc}</td>
                                    <td><Link to={`/Viewdm/${item.ma_danh_muc}`} type="button" class="btn btn-primary">Chi Tiết</Link></td>
                                    <td><Link to={`/Updatedm/${item.ma_danh_muc}`} class="btn btn-warning">Sửa</Link></td>
                                    <td><button  className="btn btn-danger" onClick={() => deleteDM(item.ma_danh_muc) } >Xóa</button></td>
                                </tr>
                                )
                            })}

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </Fragment>
    );
}
