import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { SITE } from "../config/site";
import { useShop } from "../context/ShopContext";

const faqs = [
  { question: "Đơn hàng được giao trong bao lâu?", answer: "Nội thành thường 1–3 ngày, các tỉnh thành khác 2–5 ngày làm việc. Thời gian có thể thay đổi nhẹ trong dịp cao điểm." },
  { question: "Tôi có thể đổi size như thế nào?", answer: "Bạn được đổi size miễn phí một lần trong 30 ngày kể từ lúc nhận hàng. Sản phẩm cần còn tem, chưa qua sử dụng và giặt." },
  { question: "NOVAWEAR có cho kiểm tra hàng không?", answer: "Có. Bạn có thể kiểm tra tên sản phẩm, màu, size và tình trạng bên ngoài trước khi thanh toán cho đơn vị vận chuyển." },
  { question: "Làm sao để hủy hoặc đổi địa chỉ đơn hàng?", answer: "Đơn ở trạng thái chờ xác nhận có thể hủy trong trang tài khoản. Với thay đổi địa chỉ, vui lòng liên hệ trong 2 giờ đầu sau khi đặt." },
  { question: "Mã ưu đãi có dùng chung được không?", answer: "Mỗi đơn chỉ áp dụng một mã. Mã NOVA10 giảm 10% cho đơn từ 500K; FREESHIP áp dụng cho đơn từ 399K trong thời gian chương trình." },
];

export default function SupportPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "Tư vấn sản phẩm", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const { notify } = useShop();
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.post("/contact", form);
      notify(result.message);
      setForm({ name: "", email: "", phone: "", subject: "Tư vấn sản phẩm", message: "" });
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="support-page">
      <header className="support-hero">
        <p className="eyebrow">NOVA CARE</p>
        <h1>Chúng tôi có thể<br />giúp gì cho bạn?</h1>
        <p>Tìm câu trả lời nhanh hoặc gửi lời nhắn. Đội ngũ hỗ trợ hoạt động 08:00–21:00 mỗi ngày.</p>
      </header>

      <section className="support-shortcuts">
        <Link to="/tra-cuu"><span>⌁</span><div><h2>Tra cứu đơn hàng</h2><p>Xem hành trình giao hàng theo thời gian thực.</p></div><b>→</b></Link>
        <Link to="/chon-size"><span>↔</span><div><h2>Tìm đúng size</h2><p>Dùng công cụ gợi ý theo chiều cao, cân nặng.</p></div><b>→</b></Link>
        <a href={`tel:${SITE.phone.replace(/\s/g, "")}`}><span>☎</span><div><h2>Gọi cho NOVA</h2><p>{SITE.phone} · 08:00–21:00 mỗi ngày.</p></div><b>↗</b></a>
      </section>

      <section className="policy-strip">
        <div><strong>30 ngày</strong><span>đổi size miễn phí</span></div>
        <div><strong>2–5 ngày</strong><span>giao hàng toàn quốc</span></div>
        <div><strong>699K</strong><span>miễn phí giao hàng</span></div>
        <div><strong>24 giờ</strong><span>phản hồi yêu cầu</span></div>
      </section>

      <section className="faq-section">
        <div className="faq-section__intro"><p className="eyebrow">Frequently asked</p><h2>Câu hỏi thường gặp</h2><p>Những điều khách hàng hay hỏi nhất, được trả lời ngắn gọn.</p></div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary><span>0{index + 1}</span>{faq.question}<b>＋</b></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="contact-section">
        <div className="contact-section__info">
          <p className="eyebrow">Talk to us</p>
          <h2>Chưa tìm thấy điều bạn cần?</h2>
          <p>Gửi lời nhắn, chúng tôi sẽ phản hồi qua email hoặc điện thoại trong giờ làm việc.</p>
          <div><span>Email</span><a href={`mailto:${SITE.email}`}>{SITE.email}</a></div>
          <div><span>Hotline</span><a href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a></div>
          <div><span>Địa chỉ</span><p>{SITE.address}</p></div>
        </div>
        <form className="contact-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field"><span>Họ và tên *</span><input name="name" required minLength={2} value={form.name} onChange={change} /></label>
            <label className="field"><span>Số điện thoại</span><input name="phone" value={form.phone} onChange={change} /></label>
            <label className="field field--wide"><span>Email *</span><input name="email" type="email" required value={form.email} onChange={change} /></label>
            <label className="field field--wide"><span>Bạn cần hỗ trợ về</span><select name="subject" value={form.subject} onChange={change}><option>Tư vấn sản phẩm</option><option>Chọn size</option><option>Đơn hàng & giao nhận</option><option>Đổi trả</option><option>Hợp tác</option></select></label>
            <label className="field field--wide"><span>Nội dung *</span><textarea name="message" required minLength={10} maxLength={2000} rows={5} value={form.message} onChange={change} placeholder="Hãy kể rõ hơn để NOVA hỗ trợ nhanh nhất..." /></label>
          </div>
          <button className="button button--dark" type="submit" disabled={submitting}>{submitting ? "Đang gửi..." : "Gửi lời nhắn →"}</button>
        </form>
      </section>
    </div>
  );
}
