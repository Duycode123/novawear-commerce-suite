import { useEffect } from 'react';

const useProductFilter = () => {
    useEffect(() => {
        function setupProductFilter() {
            const products = document.querySelectorAll(".product");
            products.forEach((product, index) => {
                product.setAttribute("id", index);
            });

            const filterItems = document.querySelectorAll(".filter-item");
            let oldIndex;
            let checkFilter;
            filterItems.forEach((item, index) => {
                item.addEventListener("click", () => {
                    if (index !== oldIndex) {
                        checkFilter = false;
                        oldIndex = index;
                    }
                    filterItems.forEach(filter => filter.classList.remove("active"));
                    if (checkFilter) {
                        item.classList.remove("active");
                        checkFilter = false;
                    } else {
                        item.classList.add("active");
                        checkFilter = true;
                    }
                });
            });
        }

        function checkFilter(className) {
            const options = document.querySelectorAll(`.${className} li`);
            options.forEach(option => {
                option.addEventListener("click", () => {
                    const span = document.querySelector(`.${className} .filter-item__inner span`);
                    span.textContent = option.textContent;
                });
            });
        }

        setupProductFilter();
        checkFilter("filter-size");
        checkFilter("filter-type");
        checkFilter("filter-sort");
    }, []); // Đã thêm một mảng rỗng để chỉ ra là useEffect sẽ chỉ gọi setupProductFilter() một lần, ngay sau khi mount component.
};

export default useProductFilter;
