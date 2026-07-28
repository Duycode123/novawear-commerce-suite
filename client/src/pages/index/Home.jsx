import React, { Fragment, useEffect, useState } from 'react'
import Silde from '../../components/slider/silde';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AddProduct from '../../until/cart';
import HomeSearch from '../../components/HomeSearch';


export default function Home() {

    AddProduct();
    const [data, setData] = useState([]);

    const loadData = async () => {
        const response = await axios.get("http://localhost:5000/api/top5products");
        setData(response.data);
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };
    return (
        <Fragment>
            <div className="main">
                <Silde />
                <section id="section-discounts">
                    <div className="container">
                        <div className="section-discounts-wrapper">
                            <div className="homepage-coupon-card">
                                <div className="coupon-card-item">
                                    <div className="coupon-card-item-top">
                                        <div className="description-amount">
                                            <div className="coupon-card-limit"> (Còn 50 lượt) </div>
                                            <p>Giảm 80K</p>
                                        </div>
                                        <div className="description-info">
                                            <p>
                                                "cho đơn hàng từ 399K (trừ Combo tiết kiệm, Giảm đến 30%)"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="coupon-card-item-bottom">
                                        <span className="coupon-card-coupon"> HSD5540K </span>
                                        <span className=" btn btnluuma">Lưu mã</span>
                                    </div>
                                </div>
                                <div className="coupon-card-item">
                                    <div className="coupon-card-item-top">
                                        <div className="description-amount">
                                            <div className="coupon-card-limit"> (Còn 70 lượt) </div>
                                            <p>Giảm 90K</p>
                                        </div>
                                        <div className="description-info">
                                            <p>
                                                "cho đơn hàng từ 999K (trừ Combo tiết kiệm, Giảm đến 50%)"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="coupon-card-item-bottom">
                                        <span className="coupon-card-coupon"> CP5540K </span>
                                        <span className=" btn btnluuma">Lưu mã</span>
                                    </div>
                                </div>
                                <div className="coupon-card-item">
                                    <div className="coupon-card-item-top">
                                        <div className="description-amount">
                                            <div className="coupon-card-limit"> (Còn 70 lượt) </div>
                                            <p>Giảm 20K</p>
                                        </div>
                                        <div className="description-info">
                                            <p>
                                                "cho đơn hàng từ 199K (trừ Combo tiết kiệm, Giảm đến 20%)"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="coupon-card-item-bottom">
                                        <span className="coupon-card-coupon"> JKA540K </span>
                                        <span className=" btn btnluuma">Lưu mã</span>
                                    </div>
                                </div>
                                <div className="coupon-card-item">
                                    <div className="coupon-card-item-top">
                                        <div className="description-amount">
                                            <div className="coupon-card-limit"> (Còn 72 lượt) </div>
                                            <p>Giảm 10K</p>
                                        </div>
                                        <div className="description-info">
                                            <p>
                                                "cho đơn hàng từ 99K (trừ Combo tiết kiệm, Giảm 20%)"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="coupon-card-item-bottom">
                                        <span className="coupon-card-coupon"> CPHA40K </span>
                                        <span className="btn btnluuma">Lưu mã</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="homepage-search">
                    <div className="container-medium">
                        <div className="homepage-search-wrapper">
                            <h2 className="homepage-search-heading"> Bạn tìm gì hôm nay? </h2>
                            <div className="homepage-search-inner">
                                <form action="/spotlight" method="GET">
                                    <input type="text" name="keyword" placeholder="Hãy thử bắt đầu với Quần đen xem sao" className="homepage-search-control" />
                                    <button className="homepage-search-submit">
                                        <i className="fa-solid fa-magnifying-glass fa-2xl"></i>
                                    </button>
                                </form>
                            </div>
                            <div className="homepage-search-content">
                                <p className="home-search-description"> Từ khóa nổi bật ngày hôm nay</p>
                                <div className="homepage-search-buttons">
                                    <a href="#" className="homepage-search-button">Chạy bộ</a>
                                    <a href="#" className="homepage-search-button">Giầy thể thao</a>
                                    <a href="#" className="homepage-search-button">Áo Polo</a>
                                    <a href="#" className="homepage-search-button">Quần jean</a>
                                    <a href="#" className="homepage-search-button">Áo ngủ</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="homepage-collections">
                    <div className="container--full">
                        <div className="homepage-collections__wrapper">
                            <div className="homepage-collections__item">
                                <Link to="/product" className="collection-grid">
                                    <div className="collection-grid__thumbnail">
                                        <picture style={{ width: '100%' }}>
                                            <img src="../Images/Tatcasanpham.png" alt="bannner" />
                                        </picture>
                                    </div>
                                </Link>
                            </div>
                            <div className="homepage-collections__item">
                                <Link to="/product" className="collection-grid">
                                    <div className="collection-grid__thumbnail">
                                        <picture style={{ width: '100%' }}>
                                            <img src="../Images/domachangngay.png" alt="bannner" />
                                        </picture>
                                    </div>
                                </Link>
                            </div>
                            <div className="homepage-collections__item">
                                <Link to="/product" className="collection-grid">
                                    <div className="collection-grid__thumbnail">
                                        <picture style={{ width: '100%' }}>
                                            <img src="../Images/dothethao.png" alt="bannner" />
                                        </picture>
                                    </div>
                                </Link>
                            </div>
                            <div className="homepage-collections__item">
                                <Link to="/product" className="collection-grid">
                                    <div className="collection-grid__thumbnail">
                                        <picture style={{ width: '100%' }}>
                                            <img src="../Images/domactrongnha.png" alt="bannner" />
                                        </picture>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
                <section>
                    <div className="container1">
                        <div className="homepage-product__heading"> Coolmate Top Summer</div>
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
                                            <div className='product-grid__reviews'>
                                                <div className='reviews-rating'>
                                                    <div className='reviews-rating__vote'>5.0</div>
                                                    <div className='reviews-rating__star'></div>
                                                    <div className='reviews-rating__number'>({item.total_quantity})</div>
                                                </div>
                                            </div>
                                            <div className="product-content">
                                                <div style={{ display: 'none' }} className="product-content__option ">
                                                    <div className="product-content__option-item-wrap active">
                                                        <span data={item.mau_sac}></span>
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
                </section>
                <section className="homepage-product">
                    <div className="container">
                        <div className="homepage-product__heading"> Running Collection</div>
                        <div className="bestseller__content active">
                            <div className="row">
                                <div className="col p-2-4">
                                    <div className="product">
                                        <div className="product-img-wrap" style={{ marginBottom: '8px' }}>
                                            <a href="./product-detail.html" className="product-img product-img--small">
                                                <img className="product-img-1" src="/Images/Productdisplay5.png" alt="" />
                                                <img className="product-img-2" src="/Images/Productdisplay5a.png" alt="" />
                                            </a>
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
                                                    <span data="Đen"></span>
                                                </div>
                                            </div>

                                            <a href="./product-detail.html" className="product-name">Áo Polo nam Excool</a>
                                            <div className="product-price-wrap">
                                                <div className="product-price-new">399.000đ</div>
                                                <div className="product-price">500.000đ</div>
                                                <div className="product-percent">-20%</div>
                                            </div>

                                            <div className="product-discount">
                                                Ưu đãi hè đầy sôi động
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* <!--5--> */}
                                <div className="col p-2-4">
                                    <div className="product">
                                        <div className="product-img-wrap" style={{ marginBottom: '8px' }}>
                                            <a href="./product-detail.html" className="product-img product-img--small">
                                                <img className="product-img-1" src="/Images/Productdisplay4.png" alt="" />
                                                <img className="product-img-2" src="/Images/Productdisplay4a.png" alt="" />
                                            </a>
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
                                                    <span data="Xanh bóng đêm"></span>
                                                </div>
                                            </div>

                                            <a href="./product-detail.html" className="product-name">Áo Sơ Mi nam Daily Tee</a>
                                            <div className="product-price-wrap">
                                                <div className="product-price-new">350.000đ</div>
                                                <div className="product-price">400.000đ</div>
                                                <div className="product-percent">-12%</div>
                                            </div>

                                            <div className="product-discount">
                                                Mua 2 chỉ còn 189k/chiếc
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* <!--6--> */}
                                <div className="col p-2-4">
                                    <div className="product">
                                        <div className="product-img-wrap" style={{ marginBottom: '8px' }}>
                                            <a href="./product-detail.html" className="product-img product-img--small">
                                                <img className="product-img-1" src="/Images/Productdisplay3.png" alt="" />
                                                <img className="product-img-2" src="/Images/Productdisplay3a.png" alt="" />
                                            </a>
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
                                                    <span data="Xanh Navy"></span>
                                                </div>
                                            </div>

                                            <a href="./product-detail.html" className="product-name">Áo Sơ Mi nam Cổ Tròn</a>
                                            <div className="product-price-wrap">
                                                <div className="product-price-new">254.000đ</div>
                                                <div className="product-price">299.000đ</div>
                                                <div className="product-percent">-16%</div>
                                            </div>

                                            <div className="product-discount">
                                                Mua 2 chỉ còn 189k/chiếc
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* <!--7--> */}
                                <div className="col p-2-4">
                                    <div className="product">
                                        <div className="product-img-wrap" style={{ marginBottom: '8px' }}>
                                            <a href="ThongTinSanPham.Html" className="product-img product-img--small">
                                                <img className="product-img-1" src="/Images/Productdisplay2.png" alt="" />
                                                <img className="product-img-2" src="/Images/Productdisplay2a.png" alt="" />
                                            </a>
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
                                            <a href="ThongTinSanPham.Html" className="product-name">Áo Sơ Mi nam Coolmate</a>
                                            <div className="product-price-wrap">
                                                <div className="product-price-new">254.000đ</div>
                                                <div className="product-price">299.000đ</div>
                                                <div className="product-percent">-16%</div>
                                            </div>

                                            <div className="product-discount">
                                                Mua 2 chỉ còn 189k/chiếc
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* <!--8--> */}
                                <div className="col p-2-4">
                                    <div className="product">
                                        <div className="product-img-wrap" style={{ marginBottom: '8px' }}>
                                            <a href="ThongTinSanPham.Html" className="product-img product-img--small">
                                                <img className="product-img-1" src="/Images/Productdisplay1.png" alt="" />
                                                <img className="product-img-2" src="/Images/Productdisplay1a.png" alt="" />
                                            </a>
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
                                            <a href="ThongTinSanPham.Html" className="product-name">Áo Sơ Mi nam Dệt Lụa</a>
                                            <div className="product-price-wrap">
                                                <div className="product-price-new">254.000đ</div>
                                                <div className="product-price">299.000đ</div>
                                                <div className="product-percent">-16%</div>
                                            </div>

                                            <div className="product-discount">
                                                Mua 2 chỉ còn 189k/chiếc
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="homepage-basic">
                    <div className="homepage-basic__wrapper">
                        <div className="homepage-basic__content">
                            <h2>
                                Underwear 7 Days
                            </h2>
                            <p>
                                Nhập
                                <span style={{ fontWeight: 'bold' }}>QuanSip </span>
                                - Tặng quần mặc nhà Collmate Basics
                            </p>
                            <a href="#" className="btn-primary"> Mua ngay</a>
                        </div>
                        <div className="homepage-basic__image">
                            <a href="#">
                                <picture style={{ width: '100%' }}>
                                    <img src="../Images/anhquansip.png" alt="quansip" />
                                </picture>
                            </a>
                        </div>
                    </div>
                </section>
                <section className="homepage-brands">
                    <div className="container--full">
                        <div className="homepage-brands__wrapper">
                            <div className="homepage-banner__item homepage-banner__item--cm24">
                                <div className="homepage-brands__image">
                                    <img src="../Images/anhphanbrands.png" alt="" />
                                </div>
                                <div className="homepage-brands__content">
                                    <h2> 84RISING*</h2>
                                    <p>
                                        Local brand dành cho giới trẻ
                                        <br className="mobile--hidden" />
                                        <b style={{ fontSize: '130%' }}>Áo thun đón hè chỉ từ 199k </b>
                                    </p>
                                    <a href="#" className="btn-brands"> Mua ngay</a>
                                </div>
                            </div>
                            <div className="homepage-banner__item homepage-banner__item--cm24">
                                <div className="homepage-brands__image">
                                    <img src="../Images/cm24.png" alt="" />
                                </div>
                                <div className="homepage-brands__content">
                                    <h2> CM24</h2>
                                    <p>
                                        Thương hiệu chăm sóc cá nhân cho nam giới
                                        <br className="mobile--hidden" />
                                        <b style={{ fontSize: '130%' }}>Comboo 3 sản phẩm chỉ từ 249k </b>
                                    </p>
                                    <a href="#" className="btn-brands"> Mua ngay</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="homepage-care-and-share">
                    <div className="container--full">
                        <div className="homepage-care-and-share__inner">
                            <a href="#">
                                <div className="homepage-care-and-share__image">
                                    <picture>
                                        <img src="../Images/care and share.png" alt="" />
                                    </picture>
                                </div>
                                <div className="homepage-care-and-share__content">
                                    <picture>
                                        <img src="https://mcdn.coolmate.me/image/March2023/mceclip8.png" alt="" />
                                    </picture>
                                    <h2>
                                        Góp phần mang lại <br /> cuộc sống tươi đẹp
                                        <br className="mobile--hidden" />
                                        hơn cho tụi nhỏ
                                    </h2>
                                    <div className="btn--primary"> Tìm hiểu thêm về Care&Share</div>
                                </div>
                            </a>
                        </div>
                    </div>

                </section>
                <section className="homepage-hashtag">
                    <div className="container--full">
                        <div className="homepage-hashtag__inner">
                            <p className="homepage-hashtag__left">
                                Các snar phẩm tự hào sản xuất tại Việt Nam và dành cho người Việt Nam!
                                <br />
                                Hơn 3 triệu sản phẩm đã được gửi đến tay khách hàng sử dụng và hài lòng!
                            </p>
                            <p className="homepage-hashtag__title">#Collmate</p>
                            <p className="homepage-hashtag__right">
                                Giải pháp mua sắm
                                <br />
                                Cả tủ đồ cho nam giới
                            </p>
                        </div>
                    </div>
                </section>
                <section className="homepage-service">
                    <div className="container--full">
                        <div className="homepage-service__grid">
                            <div className="homepage-service__item">
                                <div className="infomation-card">
                                    <a href="#" className="infomation-card">
                                        <div className="infomation-card__thumbnail">
                                            <img src="../Images/duahopquacauchuyen.png" alt="" />
                                        </div>
                                        <div className="infomation-card__buttons">
                                            <span className="infomation-card__title">Câu chuyện Coolmate </span>
                                            <span className="infomation-card__button">
                                                <i className="fa-solid fa-arrow-up fa-rotate-45"></i>
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            </div>
                            <div className="homepage-service__item">
                                <div className="infomation-card">
                                    <a href="#" className="infomation-card">
                                        <div className="infomation-card__thumbnail">
                                            <img src="../Images/dichvuhailong100.png" alt="" />
                                        </div>
                                        <div className="infomation-card__buttons">
                                            <span className="infomation-card__title">Dịch vụ hài lòng 100% </span>
                                            <span className="infomation-card__button">
                                                <i className="fa-solid fa-arrow-up fa-rotate-45"></i>
                                            </span>
                                        </div>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="homepage-service__list">
                            <div className="homepage-service__card">
                                <p className="homepage-service__text">
                                    Miễn phí vận chuyển cho
                                    <br />
                                    đơn hàng trên 200k
                                </p>
                            </div>
                            <div className="homepage-service__card">
                                <p className="homepage-service__text">
                                    60 ngày đổi trả
                                    <br />
                                    vì bất kì lí do gì
                                </p>
                            </div>
                            <div className="homepage-service__card">
                                <p className="homepage-service__text">
                                    đến tận nơi nhận hàng trả
                                    <br />
                                    hoàn tiền trong 24h
                                </p>
                            </div>
                            <div className="homepage-service__card">
                                <p className="homepage-service__text">
                                    Từ hào sản xuất
                                    <br />
                                    Tại Việt Nam
                                </p>
                            </div>
                        </div>

                    </div>
                </section>
                <section className="homepage-irl">
                    <div className="container--full">
                        <h2 className="homepage-irl__title">Nhật kí Coolmate</h2>
                        <p className="homepage-irl__description">Chia sẻ diện mạo mới cùng với #Collmate</p>
                        <div className="homepage-irl__slide slick-slider">
                            <button className="slick-arrow slick-prev"> <i className="fa-solid fa-arrow-left fa-2xl"></i></button>
                            <div className="slick-list">
                                <img src="../Images/homepage-irl1.png" alt="" />
                                <img src="../Images/homepage-irl2.png" alt="" />
                                <img src="../Images/homepage-irl3.png" alt="" />
                                <img src="../Images/homepage-irl4.png" alt="" />
                                <img src="../Images/homepage-irl5.png" alt="" />
                            </div>
                            <button className="slick-arrow slick-next"> <i className="fa-solid fa-arrow-right fa-2xl"></i> </button>
                        </div>
                    </div>
                </section>

            </div>
        </Fragment>
    );
}
