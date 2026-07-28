import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const topSizes = [
  { size: "S", chest: "86–92", waist: "72–78", height: "160–168", weight: "50–60" },
  { size: "M", chest: "92–98", waist: "78–84", height: "165–173", weight: "58–68" },
  { size: "L", chest: "98–104", waist: "84–90", height: "170–178", weight: "66–76" },
  { size: "XL", chest: "104–112", waist: "90–98", height: "175–185", weight: "74–88" },
];

const bottomSizes = [
  { size: "28", waist: "72–74", hip: "88–92", weight: "50–58" },
  { size: "29", waist: "74–77", hip: "91–95", weight: "56–63" },
  { size: "30", waist: "77–80", hip: "94–98", weight: "61–68" },
  { size: "31", waist: "80–83", hip: "97–101", weight: "66–73" },
  { size: "32", waist: "83–86", hip: "100–104", weight: "71–79" },
  { size: "34", waist: "86–92", hip: "104–110", weight: "78–90" },
];

function recommendSize(height, weight, fit) {
  const h = Number(height);
  const w = Number(weight);
  if (!h || !w) return null;
  let index = w < 58 ? 0 : w < 67 ? 1 : w < 76 ? 2 : 3;
  if (h >= 178 && index < 3) index += 1;
  if (fit === "relaxed" && index < 3) index += 1;
  if (fit === "slim" && index > 0) index -= 1;
  return topSizes[index].size;
}

export default function SizeGuidePage() {
  const [tab, setTab] = useState("top");
  const [calculator, setCalculator] = useState({ height: "", weight: "", fit: "regular" });
  const recommendation = useMemo(
    () => recommendSize(calculator.height, calculator.weight, calculator.fit),
    [calculator],
  );

  return (
    <div className="size-page">
      <header className="size-hero">
        <p className="eyebrow">Fit made simple</p>
        <h1>Chọn đúng size,<br />mặc đúng cảm giác.</h1>
        <p>Chỉ cần chiều cao, cân nặng và phong cách phom bạn thích. Gợi ý mang tính tham khảo; đội ngũ NOVA luôn sẵn sàng tư vấn thêm.</p>
      </header>

      <section className="size-calculator">
        <div className="size-calculator__copy">
          <p className="eyebrow">Size finder</p>
          <h2>Để NOVA gợi ý cho bạn</h2>
          <p>Nhập hai thông tin cơ bản. Không lưu lại dữ liệu của bạn.</p>
        </div>
        <div className="size-calculator__form">
          <label><span>Chiều cao (cm)</span><input type="number" min="140" max="210" value={calculator.height} onChange={(event) => setCalculator((current) => ({ ...current, height: event.target.value }))} placeholder="170" /></label>
          <label><span>Cân nặng (kg)</span><input type="number" min="35" max="150" value={calculator.weight} onChange={(event) => setCalculator((current) => ({ ...current, weight: event.target.value }))} placeholder="65" /></label>
          <fieldset>
            <legend>Bạn thích phom nào?</legend>
            <div>
              {[{ value: "slim", label: "Ôm gọn" }, { value: "regular", label: "Vừa vặn" }, { value: "relaxed", label: "Thoải mái" }].map((item) => (
                <label className={calculator.fit === item.value ? "is-active" : ""} key={item.value}>
                  <input type="radio" name="fit" value={item.value} checked={calculator.fit === item.value} onChange={(event) => setCalculator((current) => ({ ...current, fit: event.target.value }))} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className={`size-result ${recommendation ? "has-result" : ""}`}>
          <span>Size áo gợi ý</span>
          <strong>{recommendation || "—"}</strong>
          <p>{recommendation ? "Nếu số đo nằm giữa hai size, chọn size lớn hơn để mặc thoải mái." : "Nhập chiều cao và cân nặng để xem gợi ý."}</p>
          {recommendation && <Link to="/cua-hang">Xem sản phẩm size {recommendation} →</Link>}
        </div>
      </section>

      <section className="size-guide">
        <div className="size-guide__head">
          <div><p className="eyebrow">Measurement table</p><h2>Bảng kích thước</h2></div>
          <div className="tab-buttons">
            <button className={tab === "top" ? "is-active" : ""} type="button" onClick={() => setTab("top")}>Áo</button>
            <button className={tab === "bottom" ? "is-active" : ""} type="button" onClick={() => setTab("bottom")}>Quần</button>
          </div>
        </div>
        <div className="size-table-wrap">
          {tab === "top" ? (
            <table className="size-table">
              <thead><tr><th>Size</th><th>Vòng ngực (cm)</th><th>Vòng eo (cm)</th><th>Chiều cao (cm)</th><th>Cân nặng (kg)</th></tr></thead>
              <tbody>{topSizes.map((row) => <tr key={row.size}><td><strong>{row.size}</strong></td><td>{row.chest}</td><td>{row.waist}</td><td>{row.height}</td><td>{row.weight}</td></tr>)}</tbody>
            </table>
          ) : (
            <table className="size-table">
              <thead><tr><th>Size</th><th>Vòng eo (cm)</th><th>Vòng mông (cm)</th><th>Cân nặng tham khảo (kg)</th></tr></thead>
              <tbody>{bottomSizes.map((row) => <tr key={row.size}><td><strong>{row.size}</strong></td><td>{row.waist}</td><td>{row.hip}</td><td>{row.weight}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      </section>

      <section className="measure-guide">
        <div><p className="eyebrow">How to measure</p><h2>Đo trong 3 phút</h2><p>Dùng thước dây mềm, đứng thẳng tự nhiên và không siết thước quá chặt.</p></div>
        <div className="measure-grid">
          <article><span>01</span><h3>Vòng ngực</h3><p>Đo quanh phần đầy nhất của ngực, giữ thước song song với mặt đất.</p></article>
          <article><span>02</span><h3>Vòng eo</h3><p>Đo quanh vị trí nhỏ nhất của eo, thường nằm trên rốn khoảng 2–3 cm.</p></article>
          <article><span>03</span><h3>Vòng mông</h3><p>Đo quanh phần đầy nhất của mông, hai chân đứng khép tự nhiên.</p></article>
          <article><span>04</span><h3>Độ dài</h3><p>So với một món đồ vừa vặn sẵn có để chọn phom chính xác hơn.</p></article>
        </div>
      </section>

      <section className="size-help">
        <div><p className="eyebrow">Still not sure?</p><h2>Chúng tôi chọn cùng bạn.</h2><p>Gửi chiều cao, cân nặng và tên sản phẩm; đội ngũ sẽ phản hồi trong giờ làm việc.</p></div>
        <Link className="button button--accent" to="/ho-tro">Nhờ tư vấn size →</Link>
      </section>
    </div>
  );
}
