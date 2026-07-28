window.onload = function () {

    // --- Căn margin-top cho main/all-product-container dựa vào header ---
    var header = document.querySelector(".site-header");
    var allProduct = document.querySelector(".all-product-container");
    if (header && allProduct) {
        allProduct.style.marginTop = header.offsetHeight + "px";
    }

    // --- Hàm chuyển giá VND sang số ---
    function convertToNumber(price) {
        if (!price) return 0;
        var result = "";
        for (var i = 0; i < price.length; i++) {
            if (price[i] != "." && price[i] != "đ") {
                result += price[i];
            }
        }
        return parseInt(result) || 0;
    }

    // --- Hàm chuyển số sang VND ---
    function convertVND(number) {
        if (!number) return '0đ';
        var str = number.toString();
        var result = "";
        var count = 0;
        for (var i = str.length - 1; i >= 0; i--) {
            if (count % 3 == 0 && count != 0) {
                result = str[i] + '.' + result;
            } else {
                result = str[i] + result;
            }
            count++;
        }
        return result + 'đ';
    }

    // --- Thêm item vào cart ---
    function addToCart(item) {
        if (!item) return;
        var list = JSON.parse(localStorage.getItem('cart')) || [];
        var found = false;

        for (var x of list) {
            if (x.id == item.id && x.color == item.color && x.size == item.size) {
                x.quantity += item.quantity || 1;
                found = true;
                break;
            }
        }
        if (!found) list.push(item);
        localStorage.setItem('cart', JSON.stringify(list));
        loadMiniCart();
        displayNotify(item);
    }

    // --- Load mini cart ---
    function loadMiniCart() {
        var list = JSON.parse(localStorage.getItem('cart')) || [];
        var miniCartList = document.querySelector(".mini-cart__list");
        var cartNotify = document.querySelector(".header__actions-cart-notify");
        var addedProduct = document.querySelector(".added-product");

        var str = "";
        if (list.length > 0) {
            for (var x of list) {
                str += `
                <li class="mini-cart__item">
                    <a class="mini-cart__link">
                        <div class="mini-cart__link-img">
                            <img src="${x.img}" alt="">
                        </div>
                        <div class="mini-cart__link-content">
                            <p class="mini-cart__link-content-name">${x.name}</p>
                            <p class="mini-cart__link-content-describe">màu ${x.color} ${x.size}</p>
                            <p class="mini-cart__link-content-price">${convertVND(x.price)}</p>
                            <p class="mini-cart__link-content-quantity">x${x.quantity}</p>
                            <span class="mini-cart__item-cancel" onclick="XoaMiniCart('${x.id}','${x.size}','${x.color}')">✖</span>
                        </div>
                    </a>
                </li>`;
            }
        }

        if (miniCartList) miniCartList.innerHTML = list.length > 0 ? str : '<p class="cart-empty">Không có sản phẩm</p>';
        if (cartNotify) cartNotify.textContent = list.length;
        if (addedProduct) addedProduct.textContent = list.length;
    }

    // --- Xóa sản phẩm mini cart ---
    window.XoaMiniCart = function (id, size, color) {
        var list = JSON.parse(localStorage.getItem('cart')) || [];
        var index = list.findIndex(x => x.id == id && x.size == size && x.color == color);
        if (index >= 0) list.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(list));
        loadMiniCart();
    }

    // --- Hiển thị thông báo thêm vào giỏ hàng ---
    function displayNotify(item) {
        var notify = document.querySelector(".notify-added");
        if (!notify || !item) return;

        var imgEl = notify.querySelector(".notify-added-img img");
        var nameEl = notify.querySelector(".notify-added__content-name");
        var colorEl = notify.querySelector(".notify-added__color");
        var sizeEl = notify.querySelector(".notify-added__size");
        var priceEl = notify.querySelector(".notify-added__content-price");

        if (imgEl) imgEl.src = item.img;
        if (nameEl) nameEl.textContent = item.name;
        if (colorEl) colorEl.textContent = item.color;
        if (sizeEl) sizeEl.textContent = item.size;
        if (priceEl) priceEl.textContent = convertVND(item.price);

        notify.style.transform = "translateX(0px)";
        setTimeout(() => {
            notify.style.transform = "translateX(calc(100% + 20px))";
        }, 3000);
    }

    // --- Thêm sản phẩm từ danh sách ---
    document.querySelectorAll('.btn--size').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var product = btn.closest('.product');
            if (!product) return;

            var id = product.id;
            var nameEl = document.getElementById(id)?.querySelector('.product-name');
            var imgEl = document.getElementById(id)?.querySelector('.product-img-1');
            var colorEl = document.getElementById(id)?.querySelector('.product-content__option-item-wrap.active span');
            var priceEl = document.getElementById(id)?.querySelector('.product-price');

            if (!nameEl || !imgEl || !colorEl || !priceEl) return;

            addToCart({
                id: id,
                name: nameEl.textContent,
                img: imgEl.getAttribute('src'),
                color: colorEl.dataset.color,
                size: btn.textContent,
                price: convertToNumber(priceEl.textContent),
                quantity: 1,
                discount: 0
            });
        });
    });

    // --- Thêm sản phẩm từ trang chi tiết ---
    var btnAddCart = document.querySelector('.btn-addCart');
    if (btnAddCart) {
        btnAddCart.addEventListener('click', function () {
            if (this.textContent !== "Thêm vào giỏ hàng") return;

            var nameEl = document.querySelector(".content__heading");
            var imgEl = document.querySelector(".product-img__option-item.active img");
            var colorEl = document.querySelector(".content__color-heading b");
            var sizeEl = document.querySelector(".btn-size.active");
            var priceEl = document.querySelector(".content__price");
            var quantityEl = document.querySelector(".product-single__actions .quantity span");

            if (!nameEl || !imgEl || !colorEl || !sizeEl || !priceEl || !quantityEl) return;

            addToCart({
                id: "detail1",
                name: nameEl.textContent,
                img: imgEl.getAttribute("src"),
                color: colorEl.textContent,
                size: sizeEl.textContent,
                price: convertToNumber(priceEl.textContent),
                quantity: JSON.parse(quantityEl.textContent),
                discount: 0
            });
        });
    }

    // --- Load mini cart lần đầu ---
    loadMiniCart();
};
