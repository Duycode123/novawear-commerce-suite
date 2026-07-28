import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomeSearch() {
    const [keyword, setKeyword] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (keyword.trim() !== "") {
            navigate(`/product?keyword=${encodeURIComponent(keyword)}`);
        } else {
            navigate("/product"); // Nếu không nhập gì, show tất cả sản phẩm
        }
    }

    return (
        <div className="homepage-search-inner">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Hãy thử bắt đầu với Quần đen xem sao"
                    className="homepage-search-control"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                />
                <button className="homepage-search-submit" type="submit">
                    <i className="fa-solid fa-magnifying-glass fa-2xl"></i>
                </button>
            </form>
        </div>
    );
}
