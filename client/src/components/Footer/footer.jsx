import React, { Fragment } from 'react'

export default function Footer() {
  return (
    <Fragment>
            <footer className="site-footer">
                <div className="container">
                    <div className="footer-top">
                        <div className="footer-top-left">
                            <ul>
                                <li className="footer-top-left__heading"><a href="">Khám phá COOLMATE</a></li>
                                <li><a href="">Áo polo</a></li>
                                <li><a href="">Áo T-shirt</a></li>
                                <li><a href="">Áo sơ mi </a></li>
                                <li><a href="">Quần</a></li>
                                <li><a href="">Quần lót</a></li>
                                <li><a href="">Tất(vớ)</a></li>
                                <li><a href="">Phụ kiện khác</a></li>
                                <li><a href="">Coolsub</a></li>
                                <li><a href="">Hộp tạo sẵn</a></li>
                            </ul>
                            <ul>
                                <li className="footer-top-left__heading"><a  href="">Dịch vụ khách hàng</a></li>
                                <li><a href="">Hỏi đáp - FAQs</a></li>
                                <li><a href="">Chính sách đổi trả 60 ngày</a></li>
                                <li><a href="">Liên hệ</a></li>
                                <li><a href="">Dịch vụ gói quà tặng</a></li>
                                <li><a href="">Thành viên Coolclub</a></li>
                                <li><a href="">Khách hàng hài lòng 100%</a></li>
                                <li><a href="">Chính sách khuyến mãi</a></li>
                                <li><a href="">Chính sách giao hàng</a></li>
                                <li><a href="">Chính sách bảo mật</a></li>
                                <li><a href="">Chính sách bảo mật thanh toán</a></li>
                                <li className="footer-top-left__heading mg-top30"><a href="">Kiến thức mặc đẹp</a></li>
                                <li><a href="">Hướng dẫn chọn size</a></li>
                                <li ><a href="">Blog</a></li>
                                <li ><a href="">Group mặc đẹp sống chất</a></li>
                            </ul>
                            <ul>
                                <li className="footer-top-left__heading" ><a href="">Tài liệu - Tuyển dụng</a></li>
                                <li><a href="">Đăng ký bản quyền</a></li>
                                <li><a href="">Tuyển dụng</a></li>
                                <li className="footer-top-left__heading mg-top30"><a href="">Về COOLMATE</a></li>
                                <li><a href="">Câu chuyện về Coolmate</a></li>
                                <li><a href="">Gia nhập Coolmate</a></li>
                                <li><a href="">Care & Share</a></li>
                                <li><a href="">Nhà máy</a></li>
                            </ul>
                            <ul>
                                <li className="footer-top-left__heading"><a href="">Địa chỉ liên hệ</a></li>
                                <li><a href="">HUB Hà Nội: Số 103, Đường</a></li>
                                <li><a href="">Vạn Phúc, Phường Vạn Phúc,</a></li>
                                <li><a href="">Quận Hà Đông, TP. Hà Nội</a></li>
                                <li><a href="">HUB Tp HCM: Lầu 1, Số 163</a></li>
                                <li><a href="">Trần Trọng Cung, Phường</a></li>
                                <li><a href="">Tân Thuận Đông, Quận 7, Tp.</a></li>
                                <li><a href="">Hồ Chí Minh</a></li>
                            </ul>
                        </div>

                        <div className="footer-top-right">
                            <h3 className="footer-top-right__heading">COOLMATE lắng nghe bạn!</h3>
                            <p className="footer-top-right__content">
                                Chúng tôi luôn trân trọng và mong đợi nhận được mọi ý kiến đóng góp từ khách hàng
                                để có thể nâng cấp trải nghiệm dịch vụ và sản phẩm tốt hơn nữa.
                            </p>
                            <div className="btn btn--feedback">Gửi Ý Kiến</div>
                            <div className="footer-contact">
                                <div className="footer-contact__icon">
                                    <img src="../Images/icon-hotline.svg" alt=""/>
                                </div>
                                <a href="">
                                    <p className="footer-conttact__body">
                                        Hotline
                                        0343493518
                                    </p>
                                </a>                           
                            </div>
                            <div className="footer-contact">
                                    <div className="footer-contact__icon">
                                        <img src="../Images/icon-email.svg" alt=""/>
                                    </div>
                                    <a href="">
                                        <p className="footer-conttact__body">
                                            Email
                                            dinhtuankiet2730@gmail.com
                                        </p>
                                    </a>                                                 
                            </div>
                            <div className="footer-society">
                                <a href=""><img src="../Images/icon-facebook.svg" alt=""/></a>
                                <a href=""><img src="../Images/icon-instar.svg" alt=""/></a>
                                <a href=""><img src="../Images/icon-youtube.svg" alt=""/></a>

                            </div>
                        </div>
                    
                    
                </div>
                <div className="footer-bottom">
                    <p>
                        @ CÔNG TY TNHH FASTECH ASIA
                        Mã số doanh nghiệp: 0108617038. Giấy chứng nhận đăng ký doanh nghiệp do Sở Kế hoạch và Đầu tư TP Hà Nội cấp lần đầu ngày 20/02/2019.
                    </p>
                    <div className="footer-certificate">
                        <a href="">
                            <img className="footer-certificate__img" src="../Images/handle_cert.png" alt=""/>
                        </a>
                        <a href="">
                            <img className="footer-certificate__img" src="../Images/dmca_protected_15_120.png" alt=""/>
                        </a>
                        <a href="">
                            <img className="footer-certificate__img" src="../Images/Coolmate-info.png" alt=""/>
                        </a>
                        <a href="">
                            <img className="footer-certificate__img" src="../Images/logoSaleNoti.png" alt=""/>
                        </a>
                    </div>
                </div>
                </div>
            </footer>
   </Fragment>
  )
}
