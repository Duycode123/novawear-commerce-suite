import { Fragment, useEffect, useState } from "react";
import Productt from "../../until/layoutauto";
import useProductFilter from "../../until/fillter";
import { Link, useSearchParams } from "react-router-dom";
import AddProduct from "../../until/cart";
import axios from 'axios';
import ReactPaginate from 'react-paginate';

export default function Product() {
    Productt();
    useProductFilter();
    AddProduct();
    
    const [data, setData] = useState([]);
    const [totalProduct, setTotalProduct] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    // Di chuyển loadData ra ngoài useEffect
    const loadData = async () => {
        try {
            const page = searchParams.get('page') || 1;
            const response = await axios.get(`http://localhost:5000/api/getallsp?page=${page}`);
            setTotalProduct(response.data[0].totalproduct);
            setData(response.data);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu", error);
        }
    };

    const itemsPageSize = 10;

    const handlePageClick = (event) => {
        setSearchParams(params => {
            params.set('page', event.selected + 1)
            console.log(event.selected+1)
            return params
        })

      };
      const pageCount = Math.ceil(totalProduct / itemsPageSize);

    useEffect(() => {
        if (searchParams.has('page')) {
            loadData(); // Tải dữ liệu khi component được mount
        } else {
            setSearchParams(params => {
                params.set('page', 1);
                return params;
            });
        }
    }, [searchParams, setSearchParams]);

    const handleSearch = async (e) => {
        const searchTerm = e.target.value;
        if (!searchTerm) {
            // Nếu searchTerm rỗng hoặc null, tải lại toàn bộ dữ liệu
            loadData();
        } else {
            try {
                const response = await axios.get(`http://localhost:5000/api/searchsp/${searchTerm}`);
                setData(response.data);
            } catch (error) {
                console.error("Lỗi khi tìm kiếm dữ liệu", error);
            }
        }
    };
    

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };  

    return (
        <Fragment>
            <div className="all-product-container" style={{ paddingBottom: '30px' }}>
                <div className="filter">
                    <h2>Sản phẩm</h2>
                    <div className="filter-search">
                        <input  onChange={handleSearch} placeholder="Tìm kiếm sản phẩm..." type="text" />
                        <button>
                            <img src="../Images/icon-search.svg" alt="" />
                        </button>
                    </div>
                    <div className="filter-size filter-item">
                        <div className="filter-item__inner">
                            <span>Kích cỡ</span>
                            <i className="fa-solid fa-angle-down"></i>
                        </div>
                        <ul className="filter-item__option">
                            <li>XS</li>
                            <li>S</li>
                            <li>M</li>
                            <li>L</li>
                            <li>XL</li>
                            <li>2XL</li>
                            <li>3XL</li>
                        </ul>
                    </div>
                    <div className="filter-type filter-item">
                        <div className="filter-item__inner">
                            <span>Nhóm sản phẩm</span>
                            <i className="fa-solid fa-angle-down"></i>
                        </div>
                        <ul className="filter-item__option">
                            <li>Áo polo</li>
                            <li>Áo tee</li>
                            <li>Áo thể thao</li>
                        </ul>
                    </div>
                    <div className="filter-sort filter-item">
                        <div className="filter-item__inner">
                            <span>Sắp xếp</span>
                            <i className="fa-solid fa-angle-down"></i>
                        </div>
                        <ul className="filter-item__option">
                            <li>Mới nhất</li>
                            <li>Bán chạy</li>
                            <li>Giá thấp đến cao</li>
                            <li>Giá cao đến thấp</li>
                            <li>% Giảm nhiều nhất</li>
                        </ul>
                    </div>
                </div>
                <div className="container1">
                    <div className="product-type">
                        <div className="row">
                            {/* Sản phẩm mẫu */}
                            

                            {/* Render sản phẩm từ dữ liệu */}
                            {data.map((item) => (
                                <div key={item.ma_san_pham} className="col p-2-4">
                                    <div id={`${item.ma_san_pham}`} className="product">
                                        <div className="product-img-wrap" style={{ marginBottom: '8px' }}>
                                            <Link to={`/detail/${item.ma_san_pham}`} className="product-img product-img--small">
                                                <img className="product-img-1" src={item.anh_sanpham} alt="" />
                                                <img className="product-img-2" src={item.anhhover1} alt="" />
                                            </Link>
                                            <div className="product-size">
                                                <p>Thêm nhanh vào giỏ hàng +</p>
                                                <div className="btn btn--size">S</div>
                                                <div className="btn btn--size">M</div>
                                                <div className="btn btn--size">L</div>
                                                <div className="btn btn--size">XL</div>
                                                <div className="btn btn--size">2XL</div>
                                            </div>
                                        </div>
                                        <div className="product-content">
                                            <div style={{ display: 'none' }} className="product-content__option ">
                                                <div className="product-content__option-item-wrap active">
                                                    <span data={item.mau_sac}></span>
                                                    <span data={item.soluong}></span>
                                                </div>
                                            </div>
                                            <a className="product-name">{item.ten_san_pham}</a>
                                            <div className="product-price-wrap">
                                                <div className="product-price">{formatCurrency(item.gia)}</div>
                                            </div>
                                            <div className="product-discount">
                                                {item.thongbao}
                                            </div>
                                            <div className="sale-tag product-tag">{item.sale}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                </div>
                <ReactPaginate
                breakLabel="..."
                nextLabel="Trang tiếp >"
                onPageChange={handlePageClick}
                pageRangeDisplayed={5}
                pageCount={pageCount}
                previousLabel="< Trước"
                renderOnZeroPageCount={null}
                containerClassName="pagination"
                pageLinkClassName="page-num"
                previousLinkClassName="page-num"
                nextLinkClassName="page-num"
                activeLinkClassName="active"
            />
                
            </div>

           
        </Fragment>
    );
}
