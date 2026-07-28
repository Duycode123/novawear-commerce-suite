import React from "react";
import { Link } from "react-router-dom";
import { SmartImage } from "../components/Common";

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero__copy">
          <p className="eyebrow">This is NOVA</p>
          <h1>Chúng tôi làm đồ<br /><em>để bạn sống trong đó.</em></h1>
          <p>Không chạy theo một phiên bản hoàn hảo. Chỉ tạo ra những món đồ đủ tốt, đủ bền và đủ tự nhiên để đi cùng đời sống thật.</p>
          <Link className="text-link" to="/cua-hang">Khám phá sản phẩm <span>→</span></Link>
        </div>
        <div className="about-hero__visual">
          <div className="about-hero__color" />
          <SmartImage src="/Images/about-us-model.webp" alt="Người mẫu NOVAWEAR với trang phục thường nhật" loading="eager" />
          <p>EST. IN VIETNAM<br />BUILT FOR EVERYDAY</p>
        </div>
      </section>

      <section className="about-manifesto">
        <span>01 / WHY</span>
        <div>
          <p className="eyebrow">Lý do bắt đầu</p>
          <h2>Tủ đồ không cần nhiều. Chỉ cần những món muốn mặc lại.</h2>
        </div>
        <div>
          <p>NOVAWEAR bắt đầu từ một nỗi khó chịu rất thường: quá nhiều quần áo trông ổn trên ảnh nhưng lại khó sống cùng trong một ngày dài.</p>
          <p>Vì thế, chúng tôi chọn làm ít mẫu hơn và dành nhiều thời gian hơn cho từng bề mặt vải, từng độ rủ và từng chi tiết nhỏ. Mục tiêu không phải để bạn gây chú ý, mà để bạn cảm thấy đúng là mình.</p>
        </div>
      </section>

      <section className="about-collage">
        <div className="about-collage__main"><SmartImage src="/Images/DSC08342_672x990.jpg" alt="Chi tiết thiết kế áo khoác NOVAWEAR" /><span>FORM / FUNCTION</span></div>
        <div className="about-collage__small"><SmartImage src="/Images/jeanv2garment_16_672x990.jpg" alt="Chất liệu denim" /><span>MATERIAL STUDY 02</span></div>
        <blockquote>“Thoải mái không có nghĩa là xuề xòa. Đó là khi quần áo theo bạn, thay vì bắt bạn theo nó.”</blockquote>
      </section>

      <section className="about-values">
        <header><p className="eyebrow">Điều chúng tôi theo đuổi</p><h2>Ba nguyên tắc, một tủ đồ tốt hơn.</h2></header>
        <div className="about-value-grid">
          <article><span>01</span><h3>Cảm giác trước tiên</h3><p>Mỗi chất liệu đều được thử qua vận động, giặt và mặc trong khí hậu Việt Nam trước khi thành sản phẩm.</p></article>
          <article><span>02</span><h3>Phom cho đời thật</h3><p>Chúng tôi thử trên nhiều dáng người, cân bằng giữa sự gọn gàng và khoảng thở cần thiết.</p></article>
          <article><span>03</span><h3>Dùng lâu, yêu lâu</h3><p>Kiểu dáng tiết chế, cấu trúc chắc và hướng dẫn bảo quản rõ ràng để mỗi món có vòng đời dài hơn.</p></article>
        </div>
      </section>

      <section className="about-process">
        <div className="about-process__copy">
          <p className="eyebrow">From sketch to street</p>
          <h2>Mỗi sản phẩm đi qua nhiều hơn một bản vẽ.</h2>
          <p>Từ ý tưởng đến lúc lên kệ thường kéo dài 12–16 tuần. Chúng tôi chỉnh phom nhiều lần, kiểm tra độ co rút, độ bền màu và cảm giác sau giặt.</p>
          <div className="process-steps">
            <div><b>01</b><span><strong>Quan sát</strong>Đời sống thật và nhu cầu thật.</span></div>
            <div><b>02</b><span><strong>Thử nghiệm</strong>Vải, phom, chuyển động và độ bền.</span></div>
            <div><b>03</b><span><strong>Hoàn thiện</strong>Sản xuất vừa đủ, kiểm tra từng lô.</span></div>
          </div>
        </div>
        <div className="about-process__visual">
          <SmartImage src="/Images/dgrey2_1_copy_672x990.jpg" alt="Thử nghiệm phom dáng NOVAWEAR" />
          <div><strong>16</strong><span>tuần phát triển<br />trung bình</span></div>
        </div>
      </section>

      <section className="about-numbers">
        <div><strong>8</strong><span>thiết kế cốt lõi trong drop đầu</span></div>
        <div><strong>30</strong><span>ngày đổi size miễn phí</span></div>
        <div><strong>4.9</strong><span>điểm hài lòng trung bình</span></div>
        <div><strong>1</strong><span>cam kết: làm tốt điều cần thiết</span></div>
      </section>

      <section className="about-cta">
        <p className="eyebrow">Wear your own rhythm</p>
        <h2>Đồ mặc đẹp.<br />Sống nhẹ tênh.</h2>
        <Link className="button button--accent" to="/cua-hang">Tìm món dành cho bạn <span>→</span></Link>
      </section>
    </div>
  );
}
