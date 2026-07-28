import React, { Fragment, useState } from 'react';
import { Link } from "react-router-dom";
import axios from 'axios';
import { toast } from 'react-toastify';
export default function Register() {
  const [formData, setFormData] = useState({
    tenNguoiDung: '',
    sdt: '',
    email: '',
    matKhau: '',
    nhapLaiMatKhau: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.matKhau !== formData.nhapLaiMatKhau) {
      alert("Mật khẩu và Nhập lại mật khẩu không khớp.");
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/createaccount', {
        ten_nguoi_dung: formData.tenNguoiDung,
        mat_khau: formData.matKhau,
        email: formData.email,
        sdt: formData.sdt,
      });
      alert(`Đăng ký tài khoản thành công!`);
      setFormData({
        tenNguoiDung: '',
        sdt: '',
        email: '',
        matKhau: '',
        nhapLaiMatKhau: ''
      });
    } catch (error) {
      alert("Đã xảy ra lỗi trong quá trình đăng ký tài khoản.");
      console.error(error);
    }
  };

  return (
    <Fragment>
      <div className="modal-form">
        <form className="form-login1" onSubmit={handleSubmit}>
          <h2 className="login__heading">Đăng kí tài khoản</h2>
          <p className="login__text">
            Nếu đã từng mua hàng trên Website trước đây, bạn có thể dùng tính năng{" "}
            <a href="#">"Lấy mật khẩu"</a> để có thể truy cập vào tài khoản bằng email nhé.
          </p>
          <input
            type="text"
            placeholder="Tên của bạn"
            className="login__input"
            name="tenNguoiDung"
            value={formData.tenNguoiDung}
            onChange={handleChange}
          />
          <input
            type="text"
            placeholder="SĐT của bạn"
            className="login__input"
            name="sdt"
            value={formData.sdt}
            onChange={handleChange}
          />
          <input
            type="email"
            placeholder="Email của bạn"
            className="login__input"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              className="login__input"
              name="matKhau"
              value={formData.matKhau}
              onChange={handleChange}
            />
            <i 
              className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
              onClick={togglePasswordVisibility}
            ></i>
          </div>
          <div className="password-input-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              className="login__input"
              name="nhapLaiMatKhau"
              value={formData.nhapLaiMatKhau}
              onChange={handleChange}
            />
            <i 
              className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}
              onClick={toggleConfirmPasswordVisibility}
            ></i>
          </div>
          <button type="submit" className="btn btn--login1">
            Đăng ký
          </button>
          <div className="login-separate">
            <span></span>
            Hoặc
            <span></span>
          </div>
          <div className="btn btn--fb">
            <p>Đăng ký với Facebook</p>
            <img src="https://www.coolmate.me/images/facebook.svg" alt="Facebook"/>
          </div>
          <div className="btn btn--google">
            <p>Đăng ký với Google</p>
            <img src="https://www.coolmate.me/images/google.svg" alt="Google"/>
          </div>
          <div className="form-option">
            <Link to="/DangNhap">
              <span className="form-option__login1">Đăng nhập</span>
            </Link>
          </div>
        </form>
      </div>
    </Fragment>
  );
}
