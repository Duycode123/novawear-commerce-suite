import React, { Fragment, useEffect, useState } from 'react'
import Payment from '../../until/detail';
import AddProduct from '../../until/cart';
import { useParams } from 'react-router-dom';
import axios from 'axios';
export default function Details() {
    Payment();
    AddProduct();

    const [sanpham, setData] = useState({});

    const { ma_san_pham } = useParams();

    useEffect(() => {
        axios.get(`http://localhost:5000/api/getsp/${ma_san_pham}`)
            .then((resp) => setData({ ...resp.data[0] }));
    }, [ma_san_pham]);

    const formatCurrency = (number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
    };

    return (
        <Fragment>
            <main>
                <div class="container1">
                    <div class="container-product-single">
                        <div class="imgs">
                            <div class="link-page">
                                <a href="./index.html" class="link-page__homepage">Trang chủ</a>
                                <span>/</span>
                                <a href="./product-detail.html" class="link-page__currentPage">Áo thun Compact</a>
                            </div>
                            <div class="index-img">
                                <div class="index-img__item active"></div>
                                <div class="index-img__item"></div>
                                <div class="index-img__item"></div>
                            </div>
                            <div class="product-single-img">
                                <img class="product-img__main" src={sanpham.anh_sanpham} alt="" />
                                <div class="product-img__option">
                                    <div class="product-img__option-item active">
                                        <img src={sanpham.anh_sanpham} alt="" />
                                    </div>
                                    <div class="product-img__option-item active">
                                        <img src={sanpham.anhhover1} alt="" />
                                    </div>
                                    <div class="product-img__option-item">
                                        <img src={sanpham.anhhover2} alt="" />

                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="content">
                            <h1 class="content__heading">{sanpham.ten_san_pham}</h1>
                            <div class="review-rating">
                                <p class="review-label">
                                    Đã bán(web): 15
                                </p>

                            </div>
                            <div class="review-rating">
                                <p class="review-label">
                                    Số lượng còn: <span class="product-quantity">{sanpham.soluong}</span> sản phẩm
                                </p>
                            </div>

                            <p class="content__price">{formatCurrency(sanpham.gia)}</p>
                            <div class="content__discount">{sanpham.thongbao}</div>
                            <div class="content__color">
                                <p class="content__color-heading">Màu sắc: <b>Hồng Nhạt</b></p>
                                <div class="content__color-option">
                                    <div class="content__color-item active" title='{"color":"Hồng Nhạt","disabled":["3xl,2xl"]}' >
                                        <div style={{ backgroundImage: 'url(https://media3.coolmate.me/cdn-cgi/image/width=160,height=160,quality=80,format=auto/uploads/January2024/mau23CMAW.AT003.8_31.jpg)' }}></div>
                                    </div>
                                    <div class="content__color-item active" title='{"color":"Trắng","disabled":["3xl,2xl"]}' >
                                        <div div style={{ backgroundImage: 'url(https://media3.coolmate.me/cdn-cgi/image/width=160,height=160,quality=80,format=auto/uploads/October2023/promaxs3_trangg_8.jpg)' }}></div>
                                    </div>
                                    <div class="content__color-item active" title='{"color":"Xanh Rêu","disabled":["2xl"]}' >
                                        <div style={{ backgroundImage: 'url(https://media3.coolmate.me/cdn-cgi/image/width=160,height=160,quality=80,format=auto/uploads/January2024/mau23CMAW.AT003.17_62.jpg)' }}></div>
                                    </div>
                                    <div class="content__color-item active" title='{"color":"Đen","disabled":["2xl","3xl"]}' >
                                        <div style={{ backgroundImage: 'url(https://media3.coolmate.me/cdn-cgi/image/width=160,height=160,quality=80,format=auto/uploads/January2024/mau23CMAW.AT003.23.jpg)' }}></div>
                                    </div>
                                    <div class="content__color-item active" title='{"color":"Xanh","disabled":["2xl","3xl"]}' >
                                        <div style={{ backgroundImage: 'url(https://media3.coolmate.me/cdn-cgi/image/width=160,height=160,quality=80,format=auto/uploads/March2024/promax_aqua.jpg)' }}></div>
                                    </div>
                                </div>
                            </div>
                            <div class="content__size">
                                <div class="content__size-header">
                                    <span>Kích thước:</span>
                                </div>
                                <div class="content__size-option">
                                    <div class=" btn-size s">S</div>
                                    <div class=" btn-size m">M</div>
                                    <div class=" btn-size l">L</div>
                                    <div class=" btn-size xl">XL</div>
                                    <div class=" btn-size 2xl is-disabled">2XL</div>
                                    <div class=" btn-size 3xl is-disabled">3XL</div>
                                </div>
                                <div class="product-single__actions">
                                    <div class="quantity">

                                        <button class="btn-decrease">-</button>
                                        <span>1</span>
                                        <button class="btn-increase">+</button>
                                    </div>
                                    <div class="btn btn-addCart">
                                        Chọn biến thể
                                    </div>
                                </div>
                            </div>
                            <div class="product-single__policy">
                                <div class="product-policy__item">
                                    <div class="product-policy__icon">
                                        <img src="https://www.coolmate.me/images/icons/icon3.svg" alt="" />
                                    </div>
                                    <p>Đổi trả cực dễ chỉ cần số điện thoại</p>
                                </div>
                                <div class="product-policy__item">
                                    <div class="product-policy__icon">
                                        <img src="https://www.coolmate.me/images/icons/icon4.svg" alt="" />
                                    </div>
                                    <p>Miễn phí vận chuyển cho đơn hàng trên 200k</p>
                                </div>
                                <div class="product-policy__item">
                                    <div class="product-policy__icon">
                                        <img src="https://www.coolmate.me/images/icons/icon5.svg" alt="" />
                                    </div>
                                    <p>60 ngày đổi trả vì bất kỳ lý do gì</p>
                                </div>
                                <div class="product-policy__item">
                                    <div class="product-policy__icon">
                                        <img src="https://www.coolmate.me/images/icons/icon2.svg" alt="" />
                                    </div>
                                    <p>Hotline 1900.27.27.37 hỗ trợ từ 8h30 - 22h mỗi ngày</p>
                                </div>
                                <div class="product-policy__item">
                                    <div class="product-policy__icon">
                                        <img src="https://www.coolmate.me/images/icons/icon1.svg" alt="" />
                                    </div>
                                    <p>Đến tận nơi nhận hàng trả, hoàn tiền trong 24h</p>
                                </div>
                                <div class="product-policy__item">
                                    <div class="product-policy__icon">
                                        <img src="https://www.coolmate.me/images/icons/icon6.svg" alt="" />
                                    </div>
                                    <p>Giao hàng 2-5 ngày(có thể lâu hơn do Covid19)</p>
                                </div>
                            </div>
                            <div class="salient-features">
                                <div class="salient-features__header">
                                    <span>Đặc điểm nổi bật</span>
                                </div>
                                <ul>
                                    <li class="salient-features__item">- Chất liệu: 95% Cotton Compact - 5% Spandex</li>
                                    <li class="salient-features__item">- Mềm mại và không gây khó chịu khi mặc</li>
                                    <li class="salient-features__item">- Chất liệu co giãn 4 chiều đem lại sự thoải mái suốt ngày dài</li>
                                    <li class="salient-features__item">- Bền dai, không bai, nhão, xù lông</li>
                                    <li class="salient-features__item">- Sản xuất tại xưởng 8 năm kinh nghiệm tại TP Hồ Chí Minh</li>
                                    <li class="salient-features__item">- Tự hào sản xuất tại Việt Nam</li>
                                    <li class="salient-features__item">- Người mẫu: 1m84 - 73kg * Mặc size 2XL</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="detail-wrap">
                        <div class="detail">
                            <h2 class="detail__heading">Chi tiết sản phẩm</h2>
                            <p><b>T-Shirt Cotton Compact Premium</b> là sản phẩm áo thun hoàn toàn mới với nhiều sự cải tiến đã được nghiên cứu kỹ lưỡng
                                và phát triển với chất liệu <b>Cotton Compact cao cấp</b>. Một chiếc áo nên có trong tủ đồ với sự đa dụng dùng được trong mọi hoàn cảnh:
                                đi làm, đi chơi, cafe hay cả những buổi gặp mặt lịch sự thì T-Shirt Coolmate chắc chắn sẽ làm bạn trên cả sự hài lòng.
                                <b>Đơn giản nhưng cực nam tính, đơn điệu mà vẫn thời thượng</b></p>
                            <img src="https://mcdn.coolmate.me/image/August2020/27_77.jpg" alt="" />
                            <div class="info-box">Những chiếc áo của Coolmate sử dụng chất liệu cotton compact,
                                một dạng cotton chất lượng cao đem đến cho người mặc trải nghiệm tuyệt vời nhất. "Cotton Compact" là câu trả
                                lời cho các bạn đang tìm kiếm cho mình một chiếc áo thun mặc lên nhìn đẹp trai hơn một chút, bền hơn và thoáng mát hơn.
                            </div>
                            <img src="https://mcdn.coolmate.me/image/August2020/28_91.jpg" alt="" />
                            <ul style={{ listStyleType: 'disc', paddingLeft: '40px' }}>
                                <li><b>Cảm giác mướt tay, êm ái và mềm mại ngay lần đầu chạm,</b> bền và mềm x2 lần so với Cotton thông thường </li>
                                <li><b>Không nhăn, không co rút sau khi giặt,</b> chỉ cần lấy từ trong tủ và tự tin mặc mà không cần ủi đồ </li>
                                <li>Đặc biệt cotton chất lượng cao, vải dệt thoáng khí tạo sự <b>thoải mái, thoáng mát khi mặc</b> </li>
                            </ul>
                            <h3>Áo thun Cotton Compact phiên bản Premium cùng sự cải tiến không ngừng </h3>
                            <img src="https://mcdn.coolmate.me/uploads/December2021/29_1U.jpg" alt="" />
                            <h3>Một chiếc áo làm thay đổi cách nhìn nhận của bạn về áo thun trơn</h3>
                            <p style={{ textAlign: 'center' }}><b>Cotton Compact</b> với độ bền và <b>mềm mượt x2</b> lần cotton thường. <b>Độ Mềm - Mát</b> rõ rệt chỉ với lần chạm đầu tiên</p>
                            <img src="https://mcdn.coolmate.me/uploads/December2021/u30_67.jpg" alt="" />
                            <h3>COOLMATE VÀ NHỮNG CHIẾC ÁO PREMIUM</h3>
                            <table style={{ fontSize: '13px' }}>
                                <tr>
                                    <td style={{ width: '50%' }}>
                                        <p>
                                            <b>4</b> là số lần Coolmate không ngừng cải tiến và nâng cấp những sản phẩm
                                            của mình từ tháng <b>02/2019 đến 6/2020</b>. Đặc biệt với <b>T-Shirt Cotton Compact:</b>
                                        </p>
                                        <ul style={{ listStyleType: 'disc', margin: '24px 0', paddingLeft: '40px' }}>
                                            <li>Điều chỉnh việc chải lông kỹ hơn.</li>
                                            <li>Cải tiến đường may đôi ở vai áo để giữ form.</li>
                                            <li>Điều chỉnh size áo vừa vặn hơn & nâng cấp vải may ở cổ áo.</li>
                                        </ul>
                                        <p>Và Coolmate chính thức cho ra mắt sản phẩm <b>áo thun không nhăn phiên bản mới
                                            Premium Tshirt</b> - với chất liệu Cotton Compact đem đến cho người mặc sự thoáng mát và thoải mái nhất khi mặc.</p>
                                    </td>
                                    <td style={{ width: '50%', textAlign: 'center' }}>
                                        <img style={{ width: '300px', margin: '0' }} src="https://mcdn.coolmate.me/image/June2020/photo_2020-05-31_10-45-59.jpg" alt="" />
                                    </td>
                                </tr>
                            </table>
                            <p style={{ margin: '20px 0' }}><b>Coolmate</b> tin bằng tất cả tâm huyết nghiên cứu và ra mắt,
                                <b>Premium Tshirt Cotton Compact</b> sẽ là chiếc áo thun cotton chất lượng cao mà bất kỳ chàng trai nào cũng có trong tủ đồ của mình.
                            </p>
                            <img src="https://mcdn.coolmate.me/uploads/December2021/cotton_compact.jpg" alt="" />
                        </div>
                    </div>
                    <div class="feedback">
                        <div class="review-title">
                            <p class="quantity-review">966 Đánh giá</p>
                            <div class="quantity-star">
                                <span>4.8 / 5</span>
                                <i class="fa-solid fa-star"></i>
                            </div>
                        </div>
                        <div class="review-fillter">
                            <div class="review-fillter__rating">
                                <select name="" id="">
                                    <option value="">Đánh giá</option>
                                    <option value="1">1 sao</option>
                                    <option value="2">2 sao</option>
                                    <option value="3">3 sao</option>
                                    <option value="4">4 sao</option>
                                    <option value="5">5 sao</option>
                                </select>
                            </div>
                            <div class="review-filter__image">
                                <select name="" id="">
                                    <option value="">Ảnh</option>
                                    <option value="true">Có ảnh</option>
                                    <option value="false">Không ảnh</option>
                                </select>
                            </div>
                            <div class="review-filter__replied">
                                <select name="" id="">
                                    <option value="">Phản hồi</option>
                                    <option value="true">Đã phản hồi</option>
                                    <option value="false">Chưa phản hồi</option>
                                </select>
                            </div>
                        </div>
                        <div class="feedback-content">
                            <div class="row no-gutters">
                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">NguyenHai</b>
                                            <i class="feedback-product-type">Trắng/L</i>
                                            <p class="feedback-of-custom">Áo chất vải dai, mát mẻ, chất lượng tốt trong tầm giá.</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Nguyễn Huy Sơn</b>
                                            <i class="feedback-product-type">màu Rêu bụi L</i>
                                            <p class="feedback-of-custom">Do công việc bận nên cũng ko chụp được ảnh. Nhưng thật sự coolmmate chất, xịn</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Mai Đức Hân</b>
                                            <i class="feedback-product-type">màu Trắng XL</i>
                                            <p class="feedback-of-custom">Chất lượng áo tốt, đường chỉ may đều và chắc chắn. Góp ý theo ý kiến cá nhân: mình mong muốn chiếc cổ áo có thể bóp vào thêm 4cm nữa.</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Đặng Duy Hải</b>
                                            <i class="feedback-product-type">màu Rêu bụi L</i>
                                            <p class="feedback-of-custom">
                                                Áo mặc thoáng mát ,mịn rất thoải mái, nhưng dẽ bị dãn</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Nguyễn Hoàng Phúc</b>
                                            <i class="feedback-product-type">màu Rêu bụi XL</i>
                                            <p class="feedback-of-custom">
                                                Áo mặc thoáng mát, thoải mái</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Đỗ Quang Huynh</b>
                                            <i class="feedback-product-type">màu xanh Biển / 3XL</i>
                                            <p class="feedback-of-custom">hàng chất lượng</p>
                                            <p class="feedback-time">09.04.2022</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Đỗ Quang Huynh</b>
                                            <i class="feedback-product-type">màu Rêu bụi / 3XL</i>
                                            <p class="feedback-of-custom">hàng chất lượng</p>
                                            <p class="feedback-time">05.05.2033</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Lê Cường</b>
                                            <i class="feedback-product-type">màu xanh Biển XL</i>
                                            <p class="feedback-of-custom">dep</p>
                                            <p class="feedback-time">05.10.2022</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Nguyễn Khang</b>
                                            <i class="feedback-product-type">màu Trắng L</i>
                                            <p class="feedback-of-custom">Sản phẩm tốt. Được tặng kèm chai gel rửa tay khá ưng!.</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="col p-6">
                                    <div class="feedback-item">
                                        <div class="feedback-item__rating">
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star"></i>
                                            <i class="fa-solid fa-star disabled"></i>
                                        </div>
                                        <div class="feedback-item__body">
                                            <b class="feedback-userName">Khoa</b>
                                            <i class="feedback-product-type">màu Đen L</i>
                                            <p class="feedback-of-custom">Áo chất lượng, form đẹp, vải khỏi nói r, coolmate is always the best option for basic man like me.</p>
                                            <p class="feedback-time">08.05.2023</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="feedback-page">
                            <i class="fa-solid fa-angle-left btn-page-left"></i>
                            <span>1/19</span>
                            <i class="fa-solid fa-angle-right btn-page-right"></i>
                        </div>
                    </div>
                </div>
            </main>
        </Fragment>
    );
}
