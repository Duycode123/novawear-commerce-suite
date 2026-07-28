import React, { Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../../until/userContext';
import { LoadData } from '../../until/cartactive';

export default function Navbar() {
    const { user, logoutUser } = useUser();
    const navigate = useNavigate();
    const handleLogout = () => {
        logoutUser();
        navigate('/');
        var list = JSON.parse(localStorage.getItem("cart")) || [];
        list = [];
            localStorage.setItem("cart", JSON.stringify(list));
            LoadData();
      };
  return (

      <Fragment>
      <header className="site-header">
        
        <div className="topbar" style={{display: 'block'}}>
            <a href="">Ưu đãi giảm giá 20% áo polo cho nam  </a>
            <a href="Allsanpham.html"> " Mua ngay "</a>

        </div>
        <div className="header">
            <div className="header-inner">

                <div className="header__logo">
                    <Link to="/">
                        <img src="../Images/logo-coolmate.svg" alt="logo-coolmate"/>
                    </Link>

                </div>
                <div className="header__navbar hide-on-mobile-tablet">

                    <ul className="header__navbar-list">
                        <li className="header__navbar-product">
                            <Link to="/product" className="header__navbar-link">
                                Coolmate
                            </Link>
                            
                            <div className="header__navbar-product-menu-wrap">
                                <div className="header__navbar-product-menu">

                                    <div className="header__navbar-product-col">
                                        <a href="" className="header__navbar-product-heading">Bộ sưu tập</a>
                                        <ul>
                                            <li>
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Thu Đông</p>
                                                    <p className="header__navbar-product-item-link-content">Đang giảm giá cực sâu</p>
                                                </a>
                                            </li>  
                                            <li>
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Care & Share</p>
                                                    <p className="header__navbar-product-item-link-content">10% doanh thu dành cho các bé</p>
                                                </a>
                                            </li> 
                                            <li>
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Lạc Khởi</p>
                                                    <p className="header__navbar-product-item-link-content">Thiết kế đậm nét văn hóa việt</p>
                                                </a>
                                            </li> 
                                            <li>
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Coolmate Basics<span className="hot-tag">HOT</span></p>
                                                    <p className="header__navbar-product-item-link-content">BTS giá rẻ - chất lượng</p>
                                                </a>
                                            </li>   
                                        </ul>
                                    </div>
                                    
                                    <div className="header__navbar-product-col">
                                        <a href="" className="header__navbar-product-heading">Danh mục</a>
                                        <ul>
                                            <li className="header__navbar-product-item ">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Tất cả</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo khoác</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo dài tay</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo polo</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo T-shirt</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo sơ mi</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo thể thao</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item ">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Áo In Hình</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Quần lót nam</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Quần Shorts</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item ">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Quần dài</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Tất</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Phụ kiện</p>
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="header__navbar-product-col">
                                        <a href="" className="header__navbar-product-heading">Xu hướng</a>
                                        <ul>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Pre-order <span className="new-tag">NEW</span></p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Giảm nhiều nhất</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Bán chạy nhất<span className="sale-tag">SALE</span></p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Hàng mới về</p>
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="header__navbar-product-col">
                                        <a href="" className="header__navbar-product-heading">Nhu cầu</a>
                                        <ul>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Mặc hàng ngày</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Đồ mặc trong</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Đồ mặc trong</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Box đồ nam</p>
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="header__navbar-product-col">
                                        <a href="" className="header__navbar-product-heading">Công nghệ</a>
                                        <ul>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Cleandye</p>
                                                    <p className="header__navbar-product-item-link-content">Nhuộm không dùng nước</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">HeiQ Viroblock</p>
                                                    <p className="header__navbar-product-item-link-content">Diệt 99,99 % virus</p>
                                                </a>
                                            </li>
                                            <li className="header__navbar-product-item">
                                                <a href="" className="header__navbar-product-item-link">
                                                    <p className="header__navbar-product-item-link-name">Excool<span className="hot-tag">HOT</span></p>
                                                    <p className="header__navbar-product-item-link-content">Công nghệ làm mát tối đa</p>
                                                </a>
                                            </li>

                                        </ul>
                                    </div>
                                </div>

                            </div>

                        </li>

                        <li className="header__navbar-item navbar-item--about-coolmate">
                            <Link to="/about" className="header__navbar-link">Về Coolmate</Link>
                            <div className="navbar-item--about-coolmate__menu-wrap">
                                <div className="about-coolmate__menu-inner">
                                    <a href="index.html">Coolmate</a>
                                    <div className="row">
                                        <div className="col p-3">
                                            <a href="" className="about-coolmate__menu-inner-item">
                                                <img className="about-coolmate__menu-item-img" src="./Images/coolmate010.png" alt=""/>
                                                <p className="about-coolmate__menu-item-name">Coolmate 101</p>
                                                <p className="about-coolmate__menu-item-content">Tất cả những gì bạn muốn biết về Coolmate!
                                                    và gia nhập Coolmate</p>
                                            </a>
                                            
                                        </div>
                                        <div className="col p-3">
                                            <a href="" className="about-coolmate__menu-inner-item">
                                                <img className="about-coolmate__menu-item-img" src="./Images/dichvu.jpg" alt=""/>
                                                <p className="about-coolmate__menu-item-name">Dịch vụ 100% hài lòng</p>
                                                <p className="about-coolmate__menu-item-content">Bặt mí 11 dịch vụ Coolmate cam kết với khách hàng</p>
                                            </a>
                                            
                                        </div>
                                        <div className="col p-3">
                                            <a href="" className="about-coolmate__menu-inner-item">
                                                <img className="about-coolmate__menu-item-img" src="./Images/coolClub.png" alt=""/>
                                                <p className="about-coolmate__menu-item-name">Coolclub - Khách hàng thân thiết</p>
                                                <p className="about-coolmate__menu-item-content">Những ưu đãi hấp dẫn dành cho khách hàng thân thiết</p>
                                            </a>
                                            
                                        </div>
                                        <div className="col p-3">
                                            <a href="" className="about-coolmate__menu-inner-item">
                                                <img className="about-coolmate__menu-item-img" src="./Images/story.png" alt=""/>
                                                <p className="about-coolmate__menu-item-name">Câu chuyện</p>
                                                <p className="about-coolmate__menu-item-content">Về Startup với mô hình Online D2C</p>
                                            </a>
                                            
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>

                        <li className="header__navbar-item">
                            <Link to="chonsize" className="header__navbar-link">Chọn Size</Link>
                        </li>

                        <li className="header__navbar-item">
                            <a href="https://www.coolmate.me/84rising?itm_source=navbar" className="header__navbar-link">84 Rising</a>
                        </li>

                        <li className="header__navbar-item">
                            <a href="https://www.coolmate.me/lp/coolxprint-mo-hinh-dat-san-xuat-theo-yeu-cau?itm_source=navbar" className="header__navbar-link">CoolXPrint</a>
                        </li>

                        <li className="header__navbar-item">
                            <a href="https://www.coolmate.me/blog?itm_source=navbar" className="header__navbar-link">Blog</a>
                        </li>

                    </ul>

                </div>

                <div className="header__actions">
                    <div className="header__actions-search">
                        <a className="header__actions-link">
                            <i className="fa-solid fa-magnifying-glass fa-xl"></i>
                        </a>
                    </div>
                    <div className="header__actions-account">
                    <Link to="/DangNhap" className="header__actions-link">
                        <i className="fa-solid fa-user fa-xl"></i>
                    </Link>
                    <div className="dropdown-menu">
                        {/* Hiển thị thông tin người dùng hoặc "Tên tài khoản" nếu không có người dùng */}
                        {user ? (
                            <>
                                <a href="" className="dropdown-item">
                                    <i className="fas fa-user"></i> {' '}
                                    {user.name}
                                </a>
                                <Link to="/donhang" className="dropdown-item">
                                    <i className="fas fa-shopping-bag"></i> Đơn hàng
                                </Link>
                                <a href="" className="dropdown-item" onClick={handleLogout}>
                                    <i className="fas fa-sign-out-alt"></i> Đăng xuất
                                </a>
                            </>
                        ) : (
                            <>
                                <Link to="/DangNhap" className="dropdown-item">
                                    <i className="fas fa-sign-in-alt"></i> Đăng nhập
                                </Link>
                            </>
                        )}
                    </div>
                </div>
                    <div className="header__actions-cart-icon">
                        <span className="header__actions-cart-notify">0</span>
                        <Link to="/cart" className="header__actions-link">
                            <i className="fa-solid fa-bag-shopping fa-xl"></i>
                        </Link>
                        <div className="mini-cart-wrap">
                            <div className="mini-cart">
                                <div className="mini-cart-head">
                                    <span><span className="added-product"></span>  sản phẩm</span>
                                    <a href="Cart-page.html">Xem tất cả</a>
                                </div>
                                <ul className="mini-cart__list">
                                    
                                </ul>
                            </div>
                        </div>
                        

                    </div>

                </div>
            </div>
            <div className="search" style= {{ display: 'none'}}>
                <div className="search__inner">
                    <input placeholder="Tìm kiếm sản phẩm..." className="search__input" type="text"/>
                    <img className="search__img" style= {{width: '20px'}}  src="/Images/icon-search.svg" alt=""/>
                </div>
            </div>
        </div>

    </header>
      </Fragment>
  )
}
