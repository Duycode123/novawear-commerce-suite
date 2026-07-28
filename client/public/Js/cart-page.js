// Căn margin-top cho container dựa vào header
var heightHeader = document.querySelector('.site-header').offsetHeight;
document.querySelector('.cartPage-container').style.marginTop = `${heightHeader}px`;

/** Payments */
var payments = document.querySelectorAll('.payments-item');

// Mặc định chọn phương thức thanh toán đang active
document.querySelector('.payments-item.active .check').checked = true;

// Click chọn phương thức thanh toán
payments.forEach((payment, index) => {
    payment.onclick = () => {
        document.querySelector('.payments-item.active').classList.remove('active');
        payment.classList.add('active');
        // Khi check vào item thì sẽ check vào input
        payment.querySelector('.check').checked = true;
        // Cập nhật text hiển thị loại thanh toán
        var checkedPayment = document.querySelector('.payments-item.active .check');
        if (checkedPayment) {
            document.querySelector('.type-payment').textContent = checkedPayment.value;
        }
    };
});
