import React, { Fragment, useEffect, useState } from 'react'
import ActiveCart, { LoadData } from '../../until/cartactive';
import axios from "axios";
import { useUser } from '../../until/userContext';


export default function Cartpage() {

    ActiveCart();

    var list = JSON.parse(localStorage.getItem("cart")) || [];

    const { user } = useUser();

    const [state, setState] = useState({
        
        ten_khach_hang: '',
        sdt: '',
        dia_chi: '',
        tinh_thanh: '',
        quan_huyen: '',
        phuong_xa: '',
        ghi_chu: '',
        tong_tien:0
    });
         
    const { ten_khach_hang, sdt, dia_chi, tinh_thanh, quan_huyen, phuong_xa, ghi_chu,tong_tien } = state;
    
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setState({ ...state, [name]: value });
    };

    const handlePayment = (e) =>{

        if(window.confirm("Xác nhận lại thông tin đơn hàng , xác nhận đặt hàng ?")){
            e.preventDefault();

        const orderData = {
            ma_khach_hang: user.id, // Thay đổi giá trị này thành ID của khách hàng
            ngay_dat_hang: new Date().toISOString().slice(0, 10), // Lấy ngày hiện tại
            tong_tien: tong_tien, // Tổng tiền
            trang_thai: 1,
            ten_khach: ten_khach_hang,
            dia_chi: `${dia_chi}, ${phuong_xa}, ${quan_huyen}, ${tinh_thanh}`,
            ghi_chu: ghi_chu,
            sdt: sdt,
        
            chi_tiet_don_hang: list.map(item => ({
              ma_san_pham: Number(item.id),
              ten_san_pham: item.name, 
              so_luong: item.quantity,
              gia: item.price,
              kich_co: item.size,
              mau_sac: item.color ,
              anh_sanpham:item.img
            }))
        }
        axios.post("http://localhost:5000/api/addOrder", orderData)
        .then( () => {setState({ten_khach_hang :"",sdt:"",dia_chi:"",tinh_thanh:"",phuong_xa:"",quan_huyen:"",ghi_chu:""})
            list = [];
            localStorage.setItem("cart", JSON.stringify(list));
            LoadData();
          alert("Bạn đã đặt hàng thành công");

        })
        .catch(error => {
          console.error(error);
          alert("Đã có lỗi xảy ra, vui lòng thử lại sau");
        });
        }
        
    }

    useEffect(() => {
        const tongTienElement = document.querySelector('.btn-pay--price');
        if (tongTienElement) {
          const value = tongTienElement.innerText || tongTienElement.textContent;
          const numberValue = parseInt(value.replace(/[^\d]/g, ''), 10); // Loại bỏ các ký tự không phải số và chuyển đổi sang số nguyên
          setState((prevState) => ({ ...prevState, tong_tien: numberValue }));
        }
      }, []);
  return (
    <Fragment>
        <div className="main">

                {/* <!-- Phần container --> */}
                <div className="cartPage-container">
                    <form className="info">
                        <div className="info-header">
                            <h2>Thông tin vận chuyển</h2>
                        </div>
                        <div className="row info-body">
                            <div className="col p-6">
                                <input className="input-name"name="ten_khach_hang" onChange={handleInputChange} value={ten_khach_hang} placeholder="Họ tên" type="text" />
                            </div>
                            <div className="col p-6">
                                <input className="input-phone" name="sdt" onChange={handleInputChange} value={sdt} placeholder="Số điện thoại" type="text"/>
                            </div>
                            <div className="col p-12">
                                <input className="input-adress" name="dia_chi" onChange={handleInputChange} value={dia_chi} placeholder="Địa chỉ" type="text"/>
                            </div>
                            <div className="adress col p-4">
                                <select  onChange={handleInputChange} value={tinh_thanh} name="tinh_thanh">
                                    <option value="">Chọn Tỉnh/Thành Phố</option>
                                    <option value="">Chọn Tỉnh/Thành Phố</option>
                                    <option value="Hà Nội">Hà Nội</option>
                                    <option value="Hải Phòng">Hải Phòng</option>
                                    <option value="Quảng Ninh">Quảng Ninh</option>
                                    <option value="Bắc Ninh">Bắc Ninh</option>
                                    <option value="Bắc Giang">Bắc Giang</option>
                                    <option value="Hải Dương">Hải Dương</option>
                                    <option value="Hưng Yên">Hưng Yên</option>
                                    <option value="Thái Bình">Thái Bình</option>
                                    <option value="Nam Định">Nam Định</option>
                                    <option value="Ninh Bình">Ninh Bình</option>
                                    <option value="Phú Thọ">Phú Thọ</option>
                                </select>
                            </div>
                            <div className="adress col p-4">
                                <select  onChange={handleInputChange} value={quan_huyen} name="quan_huyen" >
                                    <option value="">Chọn Quận/Huyện</option>
                                    <option value="Ba Đình">Ba Đình</option>
                                    <option value="Hoàn Kiếm">Hoàn Kiếm</option>
                                    <option value="Đống Đa">Đống Đa</option>
                                    <option value="Cầu Giấy">Cầu Giấy</option>
                                    <option value="Long Biên">Long Biên</option>
                                    <option value="Hà Đông">Hà Đông</option>
                                    <option value="Gia Lâm">Gia Lâm</option>
                                    <option value="Đông Anh">Đông Anh</option>
                                    <option value="Sóc Sơn">Sóc Sơn</option>
                                    <option value="Thanh Xuân">Thanh Xuân</option>
                                </select>
                            </div>
                            <div className="adress col p-4">
                                <select onChange={handleInputChange} value={phuong_xa} name="phuong_xa">
                                <option value="">Chọn Phường/Xã</option>
                                    <option value="Phường Bách Khoa">Phường Bách Khoa</option>
                                    <option value="Phường Cát Linh">Phường Cát Linh</option>
                                    <option value="Phường Dịch Vọng">Phường Dịch Vọng</option>
                                    <option value="Phường Gia Thụy">Phường Gia Thụy</option>
                                    <option value="Phường Hoàng Liệt">Phường Hoàng Liệt</option>
                                    <option value="Phường Kim Giang">Phường Kim Giang</option>
                                    <option value="Phường Láng Hạ">Phường Láng Hạ</option>
                                    <option value="Phường Mai Dịch">Phường Mai Dịch</option>
                                    <option value="Xã An Khánh">Xã An Khánh</option>
                                    <option value="Xã Đông Ngạc">Xã Đông Ngạc</option>
                                </select>
                            </div>
                            <div className="col p-12">
                                <input onChange={handleInputChange} value={ghi_chu} name="ghi_chu" className="input-adress" placeholder="Ghi chú thêm" type="text"/>
                            </div>
                        </div>
                        <div className="payments">
                            <h2 className="payments">Hình thức thanh toán
                            </h2>
                            <div className="payments-item active">
                                <input type="radio" className="check" name="check" value="ZaloPay"/>
                                <img src="https://www.coolmate.me/images/logo-zalopay.svg" alt="" />
                                <p className="payments-item__text">Ví điện tử ZaloPay</p>
                            </div>
                            <div className="payments-item">
                                <input type="radio" className="check" name="check" value="COD"/>
                                <img style={{width:'35px',height:'35px'}}  src="https://www.coolmate.me/images/COD.svg" alt="" />
                                <div className="payments-item__text"><p>COD</p>
                                    <p>Thanh toán khi nhận hàng</p></div>
                            </div>
                            <div className="payments-item">
                                <input type="radio" className="check" name="check" value="COD"/>
                                <img src="https://shop-document.aftee.vn/images/AFTEElogo_40x40.svg" alt="" />
                                <div className="payments-item__text" style={{display:'block'}}>
                                <div style={{display:'flex',alignItems:'center',display:'block'}} className=' aftee-cm-title-container'>
                                <p>AFTEE - Mua sắm thuận tiện,linh hoạt </p>
                                <p>Trả sau miễn phí trong 10 giây chỉ với số điện thoại</p></div>

                                </div>
                                  
                            </div>
                            <div className="payments-item">
                                <input type="radio" className="check" name="check" value="MoMo"/>
                                <img style={{width:'35px' , height:'35px'}} src="https://www.coolmate.me/images/momo-icon.png" alt="" />
                                <div className="payments-item__text"><p>MOMO</p>
                                    <p>Ưu đãi đầy bất ngờ</p></div>
                            </div>
                            <div className="payments-item">
                                <input type="radio" className="check" name="check" value="ShopeePay"/>
                                <img style={{width:'35px',height:'35px'}} src="https://gateway.zalopay.vn/image/emvco/icon-vietqr.svg" alt="" />
                                <div className="payments-item__text">
                                <p>Quét QR & Thanh toán bằng ứng dụng ngân hàng</p>
                                <i style={{fontSize:'13px'}}>Mờ ứng dụng ngân hàng để thanh toán</i>
                                </div>
                            </div>
                            <div className="payments-item">
                                <input type="radio" className="check" name="check" value="VNPay"/>
                                <img style={{width:'55px'}} src="https://www.coolmate.me/images/vnpay.png" alt="" />
                                <div className="payments-item__text">
                                    <p>Thẻ ATM / Internet Banking</p>
                                    <p>Thẻ tín dụng (Credit card) / Thẻ ghi nợ (Debit card) VNPay QR</p>
                                </div>
                            </div>
                            <p style={{paddingLeft: '5px'}}>Nếu bạn không hài lòng với sản phẩm của chúng tôi? Bạn hoàn toàn có thể trả lại sản phẩm. Tìm hiểu thêm <a style={{fontWeight:'700'}} href="">tại đây</a>.</p>
                            <button type="submit" onClick={handlePayment} className="btn-pay">Thanh toán <span className="btn-pay--price"></span>(<span className="type-payment">ZaloPay</span>)</button>
                        </div>
                    </form>

                    {/* <!-- tạo khuôn đổ dữ liệu --> */}
                    <div className="list-product">
                        <div className="list-product__inner">
                            <h2>Giỏ hàng</h2>
                            <div className="list-product__item">
                                    <div className="list-product__item-img">
                                    <img src="https://media.coolmate.me/uploads/March2022/tshirtxcool-4-copy_160x181.jpg" alt=""/>
                                    </div>

                                    <div className="list-product__item-content">
                                    <div className="list-product__item-name">Áo thun cổ tròn Excool</div>
                                    <div className="list-product__item-type">Đen/L</div>
                                    <div style={{display:'flex', justifyContent: 'flex-start', margin: '28px 0 6px'}} className="">
                                        <div className="single-product-color single-product-select">
                                            <span>Đen</span>
                                            <i className="fa-solid fa-angle-down"></i>
                                        </div>
                                        <div className="single-product-size single-product-select">
                                            <span>L</span>
                                            <i className="fa-solid fa-angle-down"></i>
                                        </div >                          
                                    </div>
                                    <div style={{display:'flex',justifyContent: 'space-between',alignItems: 'center'}}>  
                                        <div className="quantity-product">
                                            <button>
                                                <svg data-v-0d8807a2="" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><g data-v-0d8807a2=""><line data-v-0d8807a2="" stroke-width="1.5" id="svg_6" y2="8" x2="10" y1="8" x1="5" stroke="#000000" fill="none"></line></g></svg>
                                            </button>
                                            <span>1</span>
                                            <button>
                                                <svg data-v-0d8807a2="" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><g data-v-0d8807a2=""><line data-v-0d8807a2="" stroke-width="1.5" y2="8" x2="12.9695" y1="8" x1="3.0305" stroke="#000000" fill="none"></line> <line data-v-0d8807a2="" stroke-width="1.5" transform="rotate(90, 8, 8)" y2="8" x2="13" y1="8" x1="3" stroke="#000000" fill="none"></line></g></svg>
                                            </button>
                                        </div>
                                        <div className="product-price">
                                            <div className="product-new-price">254.000đ</div>
                                            <div className="product-old-price">299.000đ</div>
                                        </div>
                                    </div>
                                    <div className="list-product__close">
                                        <i className="fa-solid fa-xmark"></i>
                                    </div>
                                </div>
                                </div>
                                
                                
                            </div>   
                        <div className='cart-viewing-users mgt--10'>
                            <i>
                                <span>Có </span>
                                <b>5</b>
                                <span> người đang thêm cùng sản phẩm giống bạn vào giỏ hàng.</span>
                            </i>
                        </div>
                        <div className='discount-block'>
                              <div className='coupon-public'>
                                <div className='coupons'>
                                    <div className='coupon coupon--COOL05'>
                                        <div className='coupon-left'>

                                        </div>
                                        <div className='coupon-right'>
                                            <div className='coupon-title'>
                                                COOL05
                                                <span className='coupon-count'>
                                                <i>(Còn 1159)</i>
                                            </span>
                                            </div>
                                            <div className='coupon-description'>
                                            Giảm 50K cho đơn hàng từ  590K
                                            </div>
                                            
                                        </div>
                                    </div>
                                </div>
                              </div>
                              <div className='discount-box'>
                                    <input data-v-48bbe076 type="text"  placeholder='Nhập mã giảm giá'/>
                                    <button data-v-48bbe076 disabled = "disabled"> Áp dụng</button>
                              </div>
                              <div className='discount-block'>
                                <p className='discount-heading mb-4'>
                                    Sử dụng Voucher

                                    <span>
                                        <img src="https://mcdn.coolmate.me/image/April2023/mceclip0_92.png" alt="" />
                                        <button className='text-gray-light cursor-pointer btn-gray'>Nhập mã</button>
                                    </span>
                                </p>
                              </div>
                              
                        </div>
                        <div style={{    marginTop: '10px'}} className="cost-detail">
                            <span>Tạm tính</span>
                            <span className="tamTinh"></span>
                        </div>
                        <div className="cost-detail">
                            <span>Giảm giá</span>
                            <span className="sale-off">0đ</span>
                        </div>
                        <div className="cost-detail">
                            <span>Phí giao hàng</span>
                            <span className="delever-cost">Miễn phí</span>
                        </div>
                        <div className="total">
                            <span>Tổng</span>
                            <span className="total__price"></span>
                        </div>        
                        </div>
                       
                    </div>
                    
                </div>
    </Fragment>
  );
}
