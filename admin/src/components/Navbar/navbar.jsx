import React, { Fragment } from 'react'

export default function Navbar() {
  return (
<Fragment>
<nav className="navbar navbar-expand navbar-light bg-white topbar mb-4 static-top shadow">

{/* <!-- Sidebar Toggle (Topbar) --> */}
<form className="form-inline">
    <button id="sidebarToggleTop" className="btn btn-link d-md-none rounded-circle mr-3">
        <i className="fa fa-bars"></i>
    </button>
</form>


{/* <!-- Topbar Navbar --> */}
<ul className="navbar-nav ml-auto">

    {/* <!-- Nav Item - Search Dropdown (Visible Only XS) --> */}
    <li className="nav-item dropdown no-arrow d-sm-none">
        <a className="nav-link dropdown-toggle" href="#" id="searchDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i className="fas fa-search fa-fw"></i>
        </a>
        {/* <!-- Dropdown - Messages --> */}
        <div className="dropdown-menu dropdown-menu-right p-3 shadow animated--grow-in" aria-labelledby="searchDropdown">
            <form className="form-inline mr-auto w-100 navbar-search">
                <div className="input-group">
                    <input type="text" className="form-control bg-light border-0 small" placeholder="Search for..." aria-label="Search" aria-describedby="basic-addon2"/>
                    <div className="input-group-append">
                        <button className="btn btn-primary" type="button">
                            <i className="fas fa-search fa-sm"></i>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </li>

    {/* <!-- Nav Item - Alerts --> */}
    <li className="nav-item dropdown no-arrow mx-1">
        <a className="nav-link dropdown-toggle" href="#" id="alertsDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i className="fas fa-bell fa-fw"></i>
            {/* <!-- Counter - Alerts --> */}
            <span className="badge badge-danger badge-counter">3+</span>
        </a>
        {/* <!-- Dropdown - Alerts --> */}
        <div className="dropdown-list dropdown-menu dropdown-menu-right shadow animated--grow-in" aria-labelledby="alertsDropdown">
            <h6 className="dropdown-header">
                Thông báo
            </h6>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="mr-3">
                    <div className="icon-circle bg-primary">
                        <i className="fas fa-file-alt text-white"></i>
                    </div>
                </div>
                <div>
                    <div className="small text-gray-500">Ngày 12 tháng 12 năm 2019</div>
                    <span className="font-weight-bold">Báo cáo hàng tháng mới đã sẵn sàng để tải xuống!</span>
                </div>
            </a>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="mr-3">
                    <div className="icon-circle bg-success">
                        <i className="fas fa-donate text-white"></i>
                    </div>
                </div>
                <div>
                    <div className="small text-gray-500">Ngày 7 tháng 12 năm 2019</div>
                    290,290,000 VNĐ đã được gửi vào tài khoản của bạn!
                </div>
            </a>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="mr-3">
                    <div className="icon-circle bg-warning">
                        <i className="fas fa-exclamation-triangle text-white"></i>
                    </div>
                </div>
                <div>
                    <div className="small text-gray-500">Ngày 2 tháng 12 năm 2019</div>
                    Cảnh báo chi tiêu: Chúng tôi nhận thấy tài khoản của bạn có mức chi tiêu cao bất thường.
                </div>
            </a>
            <a className="dropdown-item text-center small text-gray-500" href="#">Hiện tất cả thông báo</a>
        </div>
    </li>

    {/* <!-- Nav Item - Messages --> */}
    <li className="nav-item dropdown no-arrow mx-1">
        <a className="nav-link dropdown-toggle" href="#" id="messagesDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <i className="fas fa-envelope fa-fw"></i>
            {/* <!-- Counter - Messages --> */}
            <span className="badge badge-danger badge-counter">7</span>
        </a>
        {/* <!-- Dropdown - Messages --> */}
        <div className="dropdown-list dropdown-menu dropdown-menu-right shadow animated--grow-in" aria-labelledby="messagesDropdown">
            <h6 className="dropdown-header">
                Tin nhắn thông báo
            </h6>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="dropdown-list-image mr-3">
                    <img className="rounded-circle" src="adminclient/img/undraw_profile_1.svg" alt="..."/>
                    <div className="status-indicator bg-success"></div>
                </div>
                <div className="font-weight-bold">
                    <div className="text-truncate">Chào bạn! Tôi đang tự hỏi liệu bạn có thể giúp tôi một việc không
                         vấn đề tôi đang gặp phải.</div>
                    <div className="small text-gray-500">Emily Fowler · 58 phút</div>
                </div>
            </a>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="dropdown-list-image mr-3">
                    <img className="rounded-circle" src="adminclient/img/undraw_profile_2.svg" alt="..."/>
                    <div className="status-indicator"></div>
                </div>
                <div>
                    <div className="text-truncate">Tôi có những bức ảnh mà bạn đặt hàng tháng trước, làm thế nào
                         bạn có muốn chúng được gửi cho bạn không?</div>
                    <div className="small text-gray-500">Jae Chun · 1 ngày</div>
                </div>
            </a>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="dropdown-list-image mr-3">
                    <img className="rounded-circle" src="adminclient/img/undraw_profile_3.svg" alt="..."/>
                    <div className="status-indicator bg-warning"></div>
                </div>
                <div>
                    <div className="text-truncate">Báo cáo tháng trước có vẻ tuyệt vời, tôi rất hài lòng với
                         tiến độ cho đến nay, hãy tiếp tục phát huy nhé!</div>
                    <div className="small text-gray-500">Morgan Alvarez · 2 ngày</div>
                </div>
            </a>
            <a className="dropdown-item d-flex align-items-center" href="#">
                <div className="dropdown-list-image mr-3">
                    <img className="rounded-circle" src="https://source.unsplash.com/Mv9hjnEUHR4/60x60" alt="..."/>
                    <div className="status-indicator bg-success"></div>
                </div>
                <div>
                    <div className="text-truncate">Tôi có phải là một chàng trai tốt không? Lý do tôi hỏi là vì ai đó
                         kể với tôi rằng người ta nói điều này với tất cả những con chó, ngay cả khi chúng không ngoan...</div>
                    <div className="small text-gray-500">Chicken the Dog · 2 ngày</div>
                </div>
            </a>
            <a className="dropdown-item text-center small text-gray-500" href="#">Đọc thêm tin nhắn</a>
        </div>
    </li>

    <div className="topbar-divider d-none d-sm-block"></div>

    {/* <!-- Nav Item - User Information --> */}
    <li className="nav-item dropdown no-arrow">
    
        <a className="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <span className="mr-2 d-none d-lg-inline text-gray-600 small"></span>
            <img className="img-profile rounded-circle" src="/img/undraw_profile.svg"/>
        </a>
        {/* <!-- Dropdown - User Information --> */}
        <div className="dropdown-menu dropdown-menu-right shadow animated--grow-in" aria-labelledby="userDropdown">
            <a className="dropdown-item" href="#">
                <i className="fas fa-cogs fa-sm fa-fw mr-2 text-gray-400"></i>
                Cài đặt
            </a>
            <a className="dropdown-item" href="#">
                <i className="fas fa-list fa-sm fa-fw mr-2 text-gray-400"></i>
                Hoạt động
            </a>
            <div className="dropdown-divider"></div>
            <a className="dropdown-item" href="{{route('login')}}" data-toggle="modal" data-target="#logoutModal">
                <i className="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-gray-400"></i>
                Đăng xuất
            </a>
        </div>
    </li>
        
</ul>

</nav>
</Fragment>
  )
}
