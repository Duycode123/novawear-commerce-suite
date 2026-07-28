import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import { Flip, toast } from 'react-toastify';

export default function Indexhoadon() {
    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };  
    
    const [data , setData] = useState([]);

    const loadData =  async() =>{
        const response = await axios.get("http://localhost:5000/api/getalldonhang");
        setData(response.data);
};

        useEffect(()=>{
            loadData();
        },[]);

        const handleSearch = async (e) => {
            const searchTerm = e.target.value;
            try {
                const response = await axios.get(`http://localhost:5000/api/searchhd/${searchTerm}`);
                setData(response.data);
            } catch (error) {
                console.error("Error searching data", error);
            }
        };


        const deleteDH = (ma_don_hang) =>{
            if(window.confirm("Bạn có muốn xóa danh mục này không ?")){
                axios.delete(`http://localhost:5000/api/deletedonhang/${ma_don_hang}`);
                toast.success('Xóa đơn hàng thành công !', {
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
    <div class="card shadow mb-4">
    <div class="d-flex align-items-center justify-content-between card-header py-3">
        <h6 class="m-0 font-weight-bold text-primary">Dữ Liệu Đơn Hàng</h6>
        <a href="" class="btn btn-primary">Thêm đơn hàng </a>
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
                        <th>Tên KH</th>
                        <th>Ngày đặt</th>
                        <th>Tổng tiền</th>
                        <th>Địa chỉ</th>
                        <th>Ghi chú</th>
                        <th>Trạng thái</th>
                        <th>Chi tiết</th>
                        <th>Duyệt</th>
                        <th>Xóa</th>

                    </tr>
                </thead>

                <tbody>
                {data.map((item,index)=>{
                    return(   
                    <tr key={item.ma_don_hang}>
                        <td>{index+1}</td>
                        <td>{item.ten_khach}</td>
                        <td>{item.ngay_dat_hang.slice(0, 10)}</td>
                        <td>{formatCurrency(item.tong_tien)}</td>
                        <td>{item.dia_chi}</td>
                        <td>{item.ghi_chu}</td>
                        <td>{parseInt(item.trang_thai) === 1 ? "chưa duyệt" : "đã duyệt"}
                        </td>
                        <td><Link to={`/Viewctdh/${item.ma_don_hang}`} type="button" class="btn btn-primary">Xem</Link></td>
                        <td><Link to={`/Updatedh/${item.ma_don_hang}`} type="button" class="btn btn-warning">Duyệt</Link></td>
                        <td>
                                <button type='submit' onClick={()=> deleteDH(item.ma_don_hang)} class='btn btn-danger'>Xóa</button>
                    
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
