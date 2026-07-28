import { useEffect } from "react";

function Payment() {
  useEffect(() => {

    const $ = window.$;

    $(document).ready(function(){
        
    
        $(".btn-size").each(function(index,value){
            $(value).click(function(){
                $(".content__size-header span:first-child").html(`Kích thước: <b>${$(this).text()}</b>`)
                $(".btn-addCart").html("Thêm vào giỏ hàng")
                $(".btn-size.active").removeClass("active")
                $(this).addClass("active")
            })
        })

        $(".product-img__option-item").each(function(indexOption,value){
          $(value).click(function(){
              $(".product-img__option-item.active").removeClass("active")
              $(this).addClass("active")
              //gán src ảnh chính bằng ảnh vừa click
              $(".product-img__main").attr("src",this.children[0].src)
              //dịch thanh index img theo vị trí img__option
              $(".index-img__item.active").removeClass("active")
              $($(".index-img__item")[indexOption]).addClass("active")
          })
      })
  
      //quantity cart
      var quantity = JSON.parse($(".quantity span").text())
      $(".btn-increase").click(function(){
          quantity = quantity+1
          $(".quantity span").text(quantity)
      })
      $(".btn-decrease").click(function(){
          if(quantity>1){
              quantity = quantity-1
              $(".quantity span").text(quantity)
          }
      })
  
      function changeColor(src){
          //Thay đổi phụ
          $(".content__color-heading b").text(src.color)
      }
  
      function disabled(src){
          let disabled=src.disabled
          let btnSize=document.querySelectorAll('.btn-size')             
          for(var j=0;j<btnSize.length;j++){
              btnSize[j].classList.remove("is-disabled")
              for(var i=0;i<disabled.length;i++){                       
                  if(btnSize[j].classList[1] == disabled[i]){
                      btnSize[j].classList.add("is-disabled")
                  }
              }
          }
      }
  
      var oldOption = 0;
      $(".content__color-item").each(function(index,value){
          $(value).click(function(){
              if(index != oldOption){
                  $(".content__color-item.active").removeClass("active")
                  //thêm border vào 
                  $(this).addClass("active")
                  //object chứa src img và màu
                  var src=JSON.parse(this.title)
                  changeColor(src)
                  disabled(src)
                  //mỗi lần chọn màu khác thì phải chọn lại size nếu không có thể bị trùng vào size hết hàng
                  $(".btn-addCart").html("Chọn biến thể")
                  $(".btn-size.active").removeClass("active")
                  $(".content__size-header span:first-child").html(`Kích thước:`)
                  
                  oldOption=index
              }
              
          })
      })
    })
    
  }, []);

  return null; // Không trả về bất kỳ giao diện người dùng nào
}

export default Payment;
