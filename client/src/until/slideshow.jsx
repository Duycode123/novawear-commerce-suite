import { useEffect } from "react";

export function StartSlider() {
    useEffect(() => {

        const $ = window.$;

        $(".btn-contact").click(function(){
            $(".message").addClass("active")
        })
    
        $(".hide-message").click(function(){
            $(".message").removeClass("active")
        })

        const list = document.getElementsByClassName("slide-img");
        let index = 0;

        for (let x of list) {
            x.style.display = "none";
        }

        list[index].style.display = "block";

        function showL() {
          // Kiểm tra xem mảng list có phần tử không và index có hợp lệ không
          if (list.length > 0 && index >= 0 && index < list.length) {
              for (let x of list) {
                  x.style.display = "none";
              }
              if (index === 0) index = list.length - 1;
              else index -= 1;
              list[index].style.display = "block";
              setTimeout(showL, 2000);
          }
      }
      

        function showR() {
            for (let x of list) {
                x.style.display = "none";
            }
            if (index === list.length - 1) index = 0;
            else index += 1;
            list[index].style.display = "block";
            setTimeout(showR, 2000);
        }

        setTimeout(showL, 2000);

        // Trả về các hàm để sử dụng trong useEffect
        return () => {
            clearTimeout(showL);
            clearTimeout(showR);
        };

        
    }, []); // Gọi chỉ một lần sau khi component được render
}
