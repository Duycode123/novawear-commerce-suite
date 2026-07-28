document.addEventListener("DOMContentLoaded", function () {
    // Căn margin-top cho main dựa vào header
    var header = document.querySelector('.site-header');
    var main = document.querySelector('main');
    if (header && main) {
        main.style.marginTop = `${header.offsetHeight}px`;
    }

    // Lấy tất cả ảnh sản phẩm (nếu cần xử lý chọn ảnh)
    var imgs = document.querySelectorAll(".product-img__option-item img");
    var imgOption = document.querySelectorAll(".product-img__option-item img");

    // Xử lý click chọn size sản phẩm
    var sizeButtons = document.querySelectorAll(".btn-size");
    if (sizeButtons.length > 0) {
        sizeButtons.forEach(function (btn) {
            btn.addEventListener("click", function () {
                var sizeHeader = document.querySelector(".content__size-header span:first-child");
                if (sizeHeader) {
                    sizeHeader.innerHTML = `Kích thước: <b>${btn.textContent}</b>`;
                }

                var addCartBtn = document.querySelector(".btn-addCart");
                if (addCartBtn) {
                    addCartBtn.innerHTML = "Thêm vào giỏ hàng";
                }

                // Xoá active trước đó
                var activeBtn = document.querySelector(".btn-size.active");
                if (activeBtn) activeBtn.classList.remove("active");

                btn.classList.add("active");
            });
        });
    }
});
