import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import { toast  ,Flip } from 'react-toastify';
export default function Indexnv() {

    const[data,setData] = useState([]);

    const loadData = async() =>{
        const response = await axios.get("http://localhost:5000/api/getallnv");
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
                const response = await axios.get(`http://localhost:5000/api/searchnv/${searchTerm}`);
                setData(response.data);
            } catch (error) {
                console.error("Error searching data", error);
            }
        }
    };
    

    const deleteNV = (ma_nhan_vien) =>{
       if(window.confirm("Bạn có muốn xóa nhân viên này không ?")) {
        axios.delete(`http://localhost:5000/api/deletenv/${ma_nhan_vien}`)
            toast.success('Xóa nhân viên thành công !', {
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
    <div className="card shadow mb-4">
        <div className="d-flex align-items-center justify-content-between card-header py-3">
            <h6 className="m-0 font-weight-bold text-primary">Dữ Liệu Nhân Viên</h6>
            <Link to="/Createnv" className="btn btn-primary">Thêm nhân viên</Link>
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
                            <th>Hình Ảnh</th>
                            <th>Tên nhân viên</th>
                            <th>Sđt</th>
                            <th>Chi tiết</th>
                            <th>Sửa</th>
                            <th>Xóa</th>

                        </tr>
                    </thead>

                    <tbody>
                        {data.map((item,index)=>{
                            return(                       
                                <tr key={item.ma_nhan_vien}>
                                <td>{index+1}</td>
                                <td><img style={{borderRadius:'5px'}} src={item.anh_nhanvien} width='60' height='60' className="img img-responsive" /></td>
                                <td>{item.ten_nhan_vien}</td>
                                <td>{item.sdt}</td>
                                <td><Link to={`/Viewnv/${item.ma_nhan_vien}`} type="button" className="btn btn-primary">Chi Tiết</Link></td>
                                <td><Link to={`/Updatenv/${item.ma_nhan_vien}`} className="btn btn-warning">Sửa</Link></td>
                                <td>
                                        <button type='submit' onClick={()=> deleteNV(item.ma_nhan_vien)} className='btn btn-danger'>Xóa</button>
                                   
                                </td>
    
    
                            </tr>)
                        })}

                    </tbody>
                </table>
            </div>
        </div>
    </div>
  )
}
