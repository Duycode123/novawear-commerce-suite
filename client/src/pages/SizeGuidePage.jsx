import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const sizeCharts = {
  men: {
    top: [
      { size: "S", chest: [86, 91], waist: [71, 76], height: [160, 168], weight: [50, 59] },
      { size: "M", chest: [92, 97], waist: [77, 82], height: [165, 173], weight: [58, 67] },
      { size: "L", chest: [98, 103], waist: [83, 88], height: [170, 178], weight: [66, 75] },
      { size: "XL", chest: [104, 109], waist: [89, 94], height: [175, 183], weight: [74, 84] },
      { size: "XXL", chest: [110, 117], waist: [95, 102], height: [178, 188], weight: [83, 96] },
    ],
    bottom: [
      { size: "28", waist: [71, 73], hip: [86, 90], height: [158, 168], weight: [48, 57] },
      { size: "29", waist: [74, 76], hip: [89, 93], height: [160, 170], weight: [54, 62] },
      { size: "30", waist: [77, 79], hip: [92, 96], height: [163, 173], weight: [59, 67] },
      { size: "31", waist: [80, 82], hip: [95, 99], height: [166, 176], weight: [64, 72] },
      { size: "32", waist: [83, 86], hip: [98, 103], height: [169, 179], weight: [69, 79] },
      { size: "34", waist: [87, 92], hip: [102, 108], height: [172, 185], weight: [77, 90] },
    ],
  },
  women: {
    top: [
      { size: "XS", chest: [78, 82], waist: [60, 64], height: [150, 158], weight: [40, 47] },
      { size: "S", chest: [83, 87], waist: [65, 69], height: [155, 163], weight: [46, 53] },
      { size: "M", chest: [88, 92], waist: [70, 74], height: [158, 168], weight: [52, 60] },
      { size: "L", chest: [93, 97], waist: [75, 79], height: [163, 173], weight: [59, 68] },
      { size: "XL", chest: [98, 104], waist: [80, 86], height: [168, 178], weight: [67, 78] },
    ],
    bottom: [
      { size: "XS", waist: [60, 64], hip: [84, 88], height: [150, 158], weight: [40, 47] },
      { size: "S", waist: [65, 69], hip: [89, 93], height: [155, 163], weight: [46, 53] },
      { size: "M", waist: [70, 74], hip: [94, 98], height: [158, 168], weight: [52, 60] },
      { size: "L", waist: [75, 79], hip: [99, 103], height: [163, 173], weight: [59, 68] },
      { size: "XL", waist: [80, 86], hip: [104, 110], height: [168, 178], weight: [67, 78] },
    ],
  },
};

const ranges = {
  height: [140, 205],
  weight: [35, 130],
  chest: [65, 140],
  waist: [50, 130],
  hip: [70, 145],
};

function showRange(value) {
  return value ? `${value[0]}–${value[1]}` : "—";
}

function distanceToRange(value, range) {
  if (!Number.isFinite(value) || !range) return 0;
  if (value < range[0]) return (range[0] - value) / Math.max(1, range[1] - range[0]);
  if (value > range[1]) return (value - range[1]) / Math.max(1, range[1] - range[0]);
  const middle = (range[0] + range[1]) / 2;
  return Math.abs(value - middle) / Math.max(1, range[1] - range[0]) * 0.12;
}

function recommendSize(values) {
  const chart = sizeCharts[values.audience][values.productType];
  const measurements = {
    height: Number(values.height),
    weight: Number(values.weight),
    chest: Number(values.chest),
    waist: Number(values.waist),
    hip: Number(values.hip),
  };
  const invalid = Object.entries(measurements)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .find(([key, value]) => value < ranges[key][0] || value > ranges[key][1]);
  if (invalid) {
    return { error: `${invalid[0] === "height" ? "Chiều cao" : invalid[0] === "weight" ? "Cân nặng" : `Số đo ${invalid[0]}`} nằm ngoài phạm vi tư vấn.` };
  }

  const bodyKeys = values.productType === "top" ? ["chest", "waist"] : ["waist", "hip"];
  const suppliedBodyKeys = bodyKeys.filter((key) => measurements[key] > 0);
  if (!measurements.height || !measurements.weight) return null;

  const scored = chart.map((row, index) => {
    const bodyScore = suppliedBodyKeys.reduce(
      (sum, key) => sum + distanceToRange(measurements[key], row[key]) * 3,
      0,
    );
    const referenceScore = distanceToRange(measurements.height, row.height) * 0.8
      + distanceToRange(measurements.weight, row.weight) * 1.2;
    return { row, index, score: bodyScore + referenceScore };
  }).sort((a, b) => a.score - b.score);

  let selected = scored[0];
  const runnerUp = scored[1];
  const closeCall = runnerUp && runnerUp.score - selected.score < 0.42;
  if (closeCall && values.fit !== "regular") {
    const preferredIndex = values.fit === "relaxed"
      ? Math.max(selected.index, runnerUp.index)
      : Math.min(selected.index, runnerUp.index);
    selected = scored.find((item) => item.index === preferredIndex) || selected;
  }

  const alternative = closeCall
    ? scored.find((item) => item.row.size !== selected.row.size)?.row.size
    : null;
  const confidence = suppliedBodyKeys.length === bodyKeys.length
    ? "Cao"
    : suppliedBodyKeys.length
      ? "Khá"
      : "Tham khảo";
  const reason = suppliedBodyKeys.length
    ? `Ưu tiên ${suppliedBodyKeys.map((key) => key === "chest" ? "vòng ngực" : key === "waist" ? "vòng eo" : "vòng mông").join(" và ")}, sau đó đối chiếu chiều cao/cân nặng.`
    : "Kết quả mới dựa trên chiều cao và cân nặng; hãy nhập số đo cơ thể để tăng độ chính xác.";

  return {
    size: selected.row.size,
    alternative,
    confidence,
    reason,
    row: selected.row,
  };
}

export default function SizeGuidePage() {
  const [calculator, setCalculator] = useState({
    audience: "men",
    productType: "top",
    height: "",
    weight: "",
    chest: "",
    waist: "",
    hip: "",
    fit: "regular",
  });
  const recommendation = useMemo(() => recommendSize(calculator), [calculator]);
  const chart = sizeCharts[calculator.audience][calculator.productType];
  const change = (event) => {
    const { name, value } = event.target;
    setCalculator((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="size-page">
      <header className="size-hero">
        <p className="eyebrow">NOVA FIT SYSTEM</p>
        <h1>Chọn size bằng số đo,<br />không chọn theo cảm tính.</h1>
        <p>Công cụ ưu tiên số đo cơ thể, sau đó mới dùng chiều cao và cân nặng để đối chiếu. Kết quả áp dụng cho bảng size NOVAWEAR và không thay thế việc thử trực tiếp.</p>
      </header>

      <section className="size-calculator size-calculator--precise">
        <div className="size-calculator__copy">
          <p className="eyebrow">01 / THÔNG TIN CƠ THỂ</p>
          <h2>Đo đúng trước khi chọn.</h2>
          <p>Nhập theo centimet và kilogram. Với áo, vòng ngực là số đo quan trọng nhất; với quần, hãy ưu tiên vòng eo và vòng mông.</p>
          <div className="size-calculator__privacy">Dữ liệu chỉ được tính trên trình duyệt và không được lưu lại.</div>
        </div>

        <div className="size-calculator__form">
          <div className="size-segmented">
            <label className={calculator.audience === "men" ? "is-active" : ""}><input type="radio" name="audience" value="men" checked={calculator.audience === "men"} onChange={change} />Nam</label>
            <label className={calculator.audience === "women" ? "is-active" : ""}><input type="radio" name="audience" value="women" checked={calculator.audience === "women"} onChange={change} />Nữ</label>
          </div>
          <div className="size-segmented">
            <label className={calculator.productType === "top" ? "is-active" : ""}><input type="radio" name="productType" value="top" checked={calculator.productType === "top"} onChange={change} />Áo / lớp trên</label>
            <label className={calculator.productType === "bottom" ? "is-active" : ""}><input type="radio" name="productType" value="bottom" checked={calculator.productType === "bottom"} onChange={change} />Quần / váy</label>
          </div>
          <div className="size-input-grid">
            <label><span>Chiều cao *</span><div><input name="height" type="number" min="140" max="205" value={calculator.height} onChange={change} placeholder="170" /><small>cm</small></div></label>
            <label><span>Cân nặng *</span><div><input name="weight" type="number" min="35" max="130" value={calculator.weight} onChange={change} placeholder="65" /><small>kg</small></div></label>
            {calculator.productType === "top" && <label><span>Vòng ngực</span><div><input name="chest" type="number" min="65" max="140" value={calculator.chest} onChange={change} placeholder="96" /><small>cm</small></div></label>}
            <label><span>Vòng eo</span><div><input name="waist" type="number" min="50" max="130" value={calculator.waist} onChange={change} placeholder="80" /><small>cm</small></div></label>
            {calculator.productType === "bottom" && <label><span>Vòng mông</span><div><input name="hip" type="number" min="70" max="145" value={calculator.hip} onChange={change} placeholder="96" /><small>cm</small></div></label>}
          </div>
          <fieldset>
            <legend>Cảm giác mặc mong muốn</legend>
            <div>
              {[{ value: "slim", label: "Ôm gọn" }, { value: "regular", label: "Vừa vặn" }, { value: "relaxed", label: "Thoải mái" }].map((item) => (
                <label className={calculator.fit === item.value ? "is-active" : ""} key={item.value}>
                  <input type="radio" name="fit" value={item.value} checked={calculator.fit === item.value} onChange={change} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className={`size-result ${recommendation?.size ? "has-result" : ""}`}>
          <span>SIZE {calculator.productType === "top" ? "ÁO" : "QUẦN"} GỢI Ý</span>
          <strong>{recommendation?.size || "—"}</strong>
          {recommendation?.error
            ? <p className="size-result__error">{recommendation.error}</p>
            : recommendation?.size
              ? <>
                <b>Độ tin cậy: {recommendation.confidence}</b>
                <p>{recommendation.reason}</p>
                {recommendation.alternative && <p>Nằm gần ranh giới size {recommendation.alternative}. Chọn size lớn hơn nếu thích rộng hoặc sản phẩm có phom ôm.</p>}
                <Link to={`/cua-hang?size=${recommendation.size}`}>Xem sản phẩm size {recommendation.size} →</Link>
              </>
              : <p>Nhập đủ chiều cao và cân nặng. Thêm số đo cơ thể để kết quả đáng tin cậy hơn.</p>}
        </div>
      </section>

      <section className="size-guide">
        <div className="size-guide__head">
          <div>
            <p className="eyebrow">02 / BẢNG ĐỐI CHIẾU</p>
            <h2>{calculator.audience === "men" ? "Nam" : "Nữ"} · {calculator.productType === "top" ? "Áo và lớp trên" : "Quần và váy"}</h2>
            <p>Số đo là số đo cơ thể, không phải kích thước phẳng của sản phẩm.</p>
          </div>
          <div className="tab-buttons">
            <button className={calculator.productType === "top" ? "is-active" : ""} type="button" onClick={() => setCalculator((current) => ({ ...current, productType: "top" }))}>Áo</button>
            <button className={calculator.productType === "bottom" ? "is-active" : ""} type="button" onClick={() => setCalculator((current) => ({ ...current, productType: "bottom" }))}>Quần</button>
          </div>
        </div>
        <div className="size-table-wrap">
          <table className="size-table">
            <thead>
              <tr>
                <th>Size</th>
                {calculator.productType === "top" && <th>Vòng ngực (cm)</th>}
                <th>Vòng eo (cm)</th>
                {calculator.productType === "bottom" && <th>Vòng mông (cm)</th>}
                <th>Chiều cao (cm)</th>
                <th>Cân nặng tham khảo (kg)</th>
              </tr>
            </thead>
            <tbody>{chart.map((row) => (
              <tr className={recommendation?.size === row.size ? "is-recommended" : ""} key={row.size}>
                <td><strong>{row.size}</strong></td>
                {calculator.productType === "top" && <td>{showRange(row.chest)}</td>}
                <td>{showRange(row.waist)}</td>
                {calculator.productType === "bottom" && <td>{showRange(row.hip)}</td>}
                <td>{showRange(row.height)}</td>
                <td>{showRange(row.weight)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="size-guide__note">Nếu số đo thuộc nhiều size khác nhau, ưu tiên vòng ngực cho áo và vòng eo/mông cho quần. Sản phẩm có phom đặc biệt cần đọc thêm mục “Kiểu dáng” trên trang chi tiết.</p>
      </section>

      <section className="measure-guide">
        <div><p className="eyebrow">03 / CÁCH ĐO</p><h2>Đo trong 3 phút</h2><p>Dùng thước dây mềm, mặc lớp đồ mỏng, đứng thẳng tự nhiên và giữ thước song song với mặt sàn.</p></div>
        <div className="measure-grid">
          <article><span>01</span><h3>Vòng ngực</h3><p>Đo qua phần đầy nhất của ngực. Không nín thở và không siết thước vào cơ thể.</p></article>
          <article><span>02</span><h3>Vòng eo</h3><p>Đo tại eo tự nhiên, thường là vị trí nhỏ nhất. Luồn được một ngón tay dưới thước.</p></article>
          <article><span>03</span><h3>Vòng mông</h3><p>Đứng khép chân và đo ngang phần đầy nhất của mông, tránh để thước bị chéo.</p></article>
          <article><span>04</span><h3>Đối chiếu phom</h3><p>Kiểm tra Regular, Slim hay Relaxed trên trang sản phẩm trước khi quyết định.</p></article>
        </div>
      </section>

      <section className="size-help">
        <div><p className="eyebrow">VẪN CHƯA CHẮC?</p><h2>Chúng tôi chọn cùng bạn.</h2><p>Gửi số đo và đường dẫn sản phẩm. Nhân viên sẽ đối chiếu phom thực tế và tồn kho từng size trước khi tư vấn.</p></div>
        <Link className="button button--accent" to="/ho-tro">Nhờ tư vấn size →</Link>
      </section>
    </div>
  );
}
