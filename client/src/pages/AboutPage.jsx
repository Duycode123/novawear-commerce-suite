import React from "react";
import { Link } from "react-router-dom";
import { SmartImage } from "../components/Common";

export default function AboutPage() {
  return (
    <main className="nova-about-page">
      <section className="nova-about-hero">
        <div className="nova-about-hero__copy">
          <p className="eyebrow">VỀ NOVA / EST. VIETNAM</p>
          <h1>Đồ mặc đẹp.<br /><em>Sống thật thoải mái.</em></h1>
          <p>NOVAWEAR tạo ra những món đồ hiện đại, dễ mặc và đủ bền để theo bạn qua nhiều nhịp sống — từ buổi sáng vội vàng đến những ngày muốn đi thật chậm.</p>
          <div>
            <Link className="button button--dark" to="/cua-hang">Khám phá NOVA <span>→</span></Link>
            <a href="#cau-chuyen">Câu chuyện của chúng tôi <span>↓</span></a>
          </div>
        </div>
        <figure className="nova-about-hero__visual">
          <SmartImage src="/Images/nova-v3/about-team.png" alt="Đội ngũ NOVAWEAR" loading="eager" />
          <figcaption><span>NOVA STUDIO</span><span>HO CHI MINH CITY</span></figcaption>
        </figure>
      </section>

      <section className="nova-about-opening" id="cau-chuyen">
        <span>01 / CÂU CHUYỆN</span>
        <div>
          <p className="eyebrow">WHY NOVA EXISTS</p>
          <h2>Một tủ đồ tốt không cần quá nhiều. Nó cần những món bạn muốn mặc lại.</h2>
        </div>
        <div>
          <p>NOVA bắt đầu từ một câu hỏi rất đơn giản: vì sao có những món trông đẹp trên ảnh nhưng lại khó sống cùng trong một ngày dài? Chúng tôi nhận ra vẻ ngoài chỉ là điểm khởi đầu. Một sản phẩm tốt còn phải thoải mái khi ngồi, tự nhiên khi chuyển động, dễ phối và dễ chăm sóc.</p>
          <p>Vì vậy, NOVA chọn cách làm chậm hơn ở những phần quan trọng: nghiên cứu bề mặt vải, chỉnh từng tỷ lệ của phom, mặc thử trong lịch trình thực tế và lắng nghe phản hồi sau mỗi phiên bản. Mục tiêu không phải tạo ra thật nhiều quần áo, mà là tạo ra những lựa chọn đủ đáng tin để xuất hiện thường xuyên trong cuộc sống.</p>
        </div>
      </section>

      <section className="nova-about-editorial">
        <div className="nova-about-editorial__main">
          <SmartImage src="/Images/nova-v3/home-story.png" alt="Phong cách sống NOVAWEAR" />
          <span>FORM FOLLOWS LIFE</span>
        </div>
        <blockquote>
          <span>“</span>
          <p>Thoải mái không có nghĩa là xuề xòa. Đó là khi quần áo đi cùng bạn, thay vì bắt bạn phải chiều theo nó.</p>
          <cite>NOVA DESIGN NOTE / 001</cite>
        </blockquote>
        <div className="nova-about-editorial__detail">
          <SmartImage src="/Images/nova-v3/product-jeans-indigo.png" alt="Nghiên cứu chất liệu denim NOVAWEAR" />
          <span>MATERIAL STUDY / DENIM</span>
        </div>
      </section>

      <section className="nova-about-values">
        <header>
          <p className="eyebrow">02 / ĐIỀU NOVA TIN</p>
          <h2>Thiết kế có trách nhiệm với người mặc.</h2>
          <p>Mỗi quyết định đều bắt đầu từ trải nghiệm sử dụng thật, không chỉ từ hình ảnh trên màn hình.</p>
        </header>
        <div>
          <article><span>01</span><h3>Cảm giác trước tiên</h3><p>Vật liệu được xem xét về độ mềm, độ thoáng, khả năng co giãn và cảm giác sau nhiều giờ mặc trong khí hậu Việt Nam.</p></article>
          <article><span>02</span><h3>Phom cho đời thật</h3><p>Khoảng rộng, chiều dài và điểm rơi được cân chỉnh để sản phẩm gọn gàng nhưng không hạn chế chuyển động.</p></article>
          <article><span>03</span><h3>Ít nhưng hữu ích</h3><p>Màu sắc và kiểu dáng được tiết chế để mỗi món có thể kết hợp theo nhiều cách và xuất hiện thường xuyên hơn.</p></article>
          <article><span>04</span><h3>Dùng lâu hơn</h3><p>Kết cấu chắc, hướng dẫn bảo quản rõ ràng và dịch vụ đổi size giúp kéo dài vòng đời sử dụng thực tế.</p></article>
        </div>
      </section>

      <section className="nova-about-process">
        <div className="nova-about-process__visual">
          <SmartImage src="/Images/nova-v3/about-studio.png" alt="Quá trình phát triển sản phẩm tại NOVA Studio" />
          <div><strong>04</strong><span>chặng để một thiết kế<br />đến được tủ đồ của bạn</span></div>
        </div>
        <div className="nova-about-process__copy">
          <p className="eyebrow">03 / TỪ Ý TƯỞNG ĐẾN SẢN PHẨM</p>
          <h2>Không chỉ là một bản vẽ đẹp.</h2>
          <p>Mỗi thiết kế trải qua nhiều vòng thử và điều chỉnh trước khi được đưa vào danh mục.</p>
          <ol>
            <li><b>01</b><div><h3>Quan sát</h3><p>Tìm hiểu lịch trình, nhu cầu và những bất tiện thường gặp khi mặc hằng ngày.</p></div></li>
            <li><b>02</b><div><h3>Chọn vật liệu</h3><p>So sánh độ thoáng, độ rủ, độ đàn hồi và khả năng chăm sóc của từng cấu trúc vải.</p></div></li>
            <li><b>03</b><div><h3>Chỉnh phom</h3><p>Mặc thử, vận động và điều chỉnh trên nhiều vóc dáng để đạt tỷ lệ cân bằng.</p></div></li>
            <li><b>04</b><div><h3>Kiểm tra</h3><p>Đánh giá đường may, màu sắc, độ co rút và cảm giác sử dụng trước khi lên kệ.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="nova-about-standard">
        <header><p className="eyebrow">NOVA STANDARD</p><h2>Lời hứa không nằm trên nhãn. Nó nằm trong trải nghiệm.</h2></header>
        <div className="nova-about-standard__grid">
          <article><strong>30</strong><span>ngày đổi size</span><p>Thêm thời gian để bạn chắc chắn về lựa chọn của mình.</p></article>
          <article><strong>2–5</strong><span>ngày giao dự kiến</span><p>Hành trình đơn hàng được cập nhật rõ trong trang tài khoản.</p></article>
          <article><strong>7/7</strong><span>ngày hỗ trợ</span><p>Đội ngũ NOVA sẵn sàng hỗ trợ về sản phẩm, size và đơn hàng.</p></article>
          <article><strong>01</strong><span>mục tiêu chung</span><p>Làm tốt những món đồ bạn thực sự muốn sử dụng lâu dài.</p></article>
        </div>
      </section>

      <section className="nova-about-community">
        <div>
          <p className="eyebrow">04 / MADE WITH YOU</p>
          <h2>NOVA không hoàn thiện nếu thiếu người mặc.</h2>
          <p>Đánh giá sau khi nhận hàng, câu hỏi về size và phản hồi trong quá trình sử dụng đều giúp chúng tôi nhìn thấy sản phẩm ở ngoài studio — nơi nó thực sự thuộc về.</p>
          <div><Link to="/cua-hang">Bắt đầu mua sắm <span>→</span></Link><Link to="/tin-tuc">Đọc NOVA Journal <span>↗</span></Link></div>
        </div>
        <SmartImage src="/Images/nova-v3/home-hero.png" alt="Cộng đồng mặc đẹp cùng NOVAWEAR" />
      </section>

      <section className="nova-about-cta">
        <p className="eyebrow">WEAR YOUR OWN RHYTHM</p>
        <h2>Đừng mặc để trở thành ai khác.<br /><em>Hãy mặc để sống đúng nhịp của mình.</em></h2>
        <Link className="button button--accent" to="/cua-hang">Tìm món dành cho bạn <span>→</span></Link>
      </section>
    </main>
  );
}
