import  { useEffect } from "react";

const $ = window.$;

export function LoadData() {
  var list = JSON.parse(localStorage.getItem("cart")) || [];
  var str = "";
  var total = 0;
  var tamtinh = 0;
  for (let x of list) {
    // Sửa 'x of list' thành 'let x of list'
    total += x.price * x.quantity - x.discount;
    tamtinh += x.price * x.quantity;
    str += `<div class="list-product__item">
      <div class="list-product__item-img">
        <img src="${x.img}" alt="">
      </div>
      <div class="list-product__item-content">
        <div class="list-product__item-name">${x.name}</div>
        <div class="list-product__item-type">${x.color}/${x.size}</div>
        <div style="display:flex;justify-content: flex-start; margin: 28px 0 6px;" class="">                         
        </div>
        <div style="display:flex;justify-content: space-between;align-items: center;">  
          <div class="quantity-product">
            <button onclick="Giam('${x.id}')">
              <svg data-v-0d8807a2="" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><g data-v-0d8807a2=""><line data-v-0d8807a2="" stroke-width="1.5" id="svg_6" y2="8" x2="10" y1="8" x1="5" stroke="#000000" fill="none"></line></g></svg>
            </button>
            <span>${x.quantity}</span>
            <button onclick="Tang('${x.id}')">
              <svg data-v-0d8807a2="" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><g data-v-0d8807a2=""><line data-v-0d8807a2="" stroke-width="1.5" y2="8" x2="12.9695" y1="8" x1="3.0305" stroke="#000000" fill="none"></line> <line data-v-0d8807a2="" stroke-width="1.5" transform="rotate(90, 8, 8)" y2="8" x2="13" y1="8" x1="3" stroke="#000000" fill="none"></line></g></svg>
            </button>
          </div>
          <div class="product-price">
            <div class="product-new-price">${convertVND(x.price)}</div>
          </div>
        </div>
        <div class="list-product__close" onclick="Xoa('${x.id}','${
      x.size
    }','${x.color}')">
          <i class="fa-solid fa-xmark"></i>
        </div>
      </div>
    </div>`;
  }
  if (total < 200) {
    total += 25000;
    $(".delever-cost").text("25.000đ");
  } else {
    $(".delever-cost").text("Miễn phí");
  }
  $(".list-product__inner").html(str);
  $(".total__price").text(convertVND(total));
  $(".tamTinh").text(convertVND(tamtinh));
  $(".btn-pay--price").text(convertVND(total));
  if (list.length === 0) {
    $(".btn-pay").css({ opacity: "0.5", "pointer-events": "none" });
  }
  loadMiniCart();
}

export function loadMiniCart() {
  // lấy dữ liệu trên lc trả thành mảng nếu có
  var list = JSON.parse(localStorage.getItem("cart")) || [];
  var str = "";
  var length = list.length;
  // kiểm tra slg
  if (length > 0) {
    // for ra thành các list
    for (let x of list) {
      str += `<li class="mini-cart__item">
                        <a class="mini-cart__link">
                        <div class="mini-cart__link-img">
                            <img src="${x.img}" alt="">
                        </div>
                        <div class="mini-cart__link-content">
                            <p class="mini-cart__link-content-name">${
                              x.name
                            }</p>
                            <p class="mini-cart__link-content-describe">màu ${
                              x.color
                            } ${x.size}</p>
                            <p class="mini-cart__link-content-price">${convertVND(
                              x.price
                            )}</p>
                            <p class="mini-cart__link-content-quantity">x${
                              x.quantity
                            }</p>
                            <span class="mini-cart__item-cancel" onclick="Xoa('${
                              x.id
                            }','${x.size}','${x.color}')">✕</span>
            
                        </div>
                        </a>
                    </li>`;
    }
    // load nội dung lên mini card
    $(".mini-cart__list").html(str);
    $(".header__actions-cart-notify").text(`${length}`);
    $(".added-product").text(`${length}`);
  } else {
    $(".mini-cart__list").html(
      '<p class="cart-empty">Không có sản phẩm</p>'
    );
    $(".header__actions-cart-notify").text("0");
    $(".added-product").text("0");
  }
}

function convertVND(number) {
  if (number === 0) {
    return "0đ";
  }
  // Chuyển dạng số thành chuỗi
  var str = JSON.stringify(number);
  var result = "";
  var length = str.length;
  var count = 0;
  for (var i = length - 1; i >= 0; --i) {
    if (count % 3 === 0 && count !== 0) {
      result = str[i] + "." + result;
    } else {
      result = str[i] + result;
    }
    count++;
  }
  return result + "đ";
}

function ActiveCart() {
  
  useEffect(() => {

    var payments = document.querySelectorAll('.payments-item')
    var paymentsInput = document.querySelector('.payments-item input')
    document.querySelector('.payments-item.active .check').checked = true; 

    payments.forEach((payment, index) => {
        payment.onclick = () => {
            document.querySelector('.payments-item.active').classList.remove('active');
            payment.classList.add('active');
            document.querySelector('.payments-item.active .check').checked = true;//khi check vào item thì sẽ check vào input
        }
    })
    // lặp qua và gắn onclick
    $(".payments-item").each(function(index,value) {
        $(value).click(function(){
            // Duyệt qua nếu check đk chọn thì gán value
            $(".check").each(function(){
                if(this.checked){
                    $(".type-payment").text(this.value)
                }
            })
        })
    })
    var list = JSON.parse(localStorage.getItem("cart")) || [];

    LoadData();

    loadMiniCart();

    // Cập nhật giỏ hàng
    function updateCart() {
      localStorage.setItem("cart", JSON.stringify(list));
    }

    // xóa sản phẩm dựa trên id
    function Xoa(id, size, color) {
      var index = list.findIndex(
        (x) => x.id === id && x.size === size && x.color === color
      );
      if (index >= 0) {
        // Nếu sp tồn tại thì xóa
        list.splice(index, 1);
      }
      updateCart();
      loadMiniCart();
      LoadData();
    }

    /*Tăng số lượng sản phẩm*/
    function Tang(id) {
      var index = list.findIndex((x) => x.id === id);
      if (index >= 0) {
        list[index].quantity += 1;
      }
      updateCart();
      LoadData();
      loadMiniCart();
    }

    /*Giảm số lượng sản phẩm*/
    function Giam(id) {
      var index = list.findIndex((x) => x.id === id);
      if (index >= 0 && list[index].quantity > 1) {
        list[index].quantity -= 1;
      }
      updateCart();
      LoadData();
      loadMiniCart();
    }

    window.Xoa = Xoa;
    window.Tang = Tang;
    window.Giam = Giam;
  }, []);
}

export default ActiveCart;
