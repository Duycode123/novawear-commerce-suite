import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import { SmartImage } from "../components/Common";
import { Seo, absoluteUrl } from "../components/Seo";

const fallbackContent = {
  "news-001": `## Mặc theo lớp, không mặc thật dày
Thời tiết chuyển mùa thường thay đổi giữa buổi sáng, giữa trưa và chiều tối. Thay vì chọn một lớp áo thật dày, hãy bắt đầu bằng áo thun hoặc sơ mi thoáng, sau đó thêm một lớp khoác nhẹ có thể cởi ra và mang theo dễ dàng.

Một bộ đồ nhiều lớp hiệu quả nên giữ được sự gọn gàng khi mặc cùng nhau. Áo trong có phom vừa người, lớp giữa mềm và lớp ngoài rộng hơn một chút sẽ giúp tổng thể không bị cộm.

## Giữ bảng màu thật đơn giản
Hai đến ba màu là đủ cho một bộ trang phục hằng ngày. Đen, trắng, be, xám và xanh navy tạo nền dễ kết hợp; một màu nhấn nhẹ ở áo khoác hoặc phụ kiện giúp tổng thể có điểm dừng mà không trở nên rối mắt.

Khi các lớp trang phục gần nhau về sắc độ, bộ đồ thường trông liền mạch và chỉn chu hơn. Đây cũng là cách đơn giản để sử dụng lại những món cơ bản theo nhiều tổ hợp khác nhau.

## Chú ý vào tỷ lệ
Nếu áo khoác có phom rộng, quần nên gọn vừa hoặc có đường ống rõ ràng. Ngược lại, một chiếc quần relaxed có thể cân bằng với áo trên vừa người. Tỷ lệ tốt giúp trang phục thoải mái nhưng vẫn có chủ đích.

Trước khi ra ngoài, hãy thử ngồi xuống, giơ tay và bước vài bước. Một bộ đồ đẹp trong gương nhưng gây vướng khi chuyển động sẽ khó trở thành lựa chọn bạn muốn mặc lại.

## Công thức dễ áp dụng
Áo thun trơn, sơ mi khoác ngoài và quần dài trung tính là công thức phù hợp nhiều lịch trình. Khi trời mát hơn, thay sơ mi bằng áo khoác nhẹ; khi nhiệt độ tăng, chỉ cần bỏ lớp ngoài mà bộ đồ vẫn hoàn chỉnh.`,
  "news-002": `## Bắt đầu bằng số đo cơ thể
Dùng thước dây đo vòng ngực, vòng eo và vòng mông tại vị trí đầy đặn nhất. Thước nên nằm ngang, ôm sát nhưng không siết chặt. Đo khi mặc lớp quần áo mỏng sẽ cho kết quả chính xác hơn.

Với quần, hãy đo thêm chiều dài từ cạp đến vị trí gấu mong muốn. Với áo khoác hoặc sơ mi, số đo vai và chiều dài tay sẽ giúp bạn đánh giá phom rõ hơn.

## Đối chiếu bảng size của từng sản phẩm
Không nên mặc định rằng bạn luôn dùng cùng một size cho mọi kiểu đồ. Chất liệu co giãn, kiểu dáng ôm hay relaxed và mục đích sử dụng đều ảnh hưởng đến lựa chọn.

Nếu số đo nằm giữa hai size, hãy chọn size nhỏ hơn khi muốn phom gọn và chất liệu có độ co giãn tốt. Chọn size lớn hơn nếu bạn ưu tiên sự thoải mái hoặc muốn phối thêm lớp bên trong.

## Đọc kỹ phần mô tả phom
Regular fit thường tạo khoảng thoải mái vừa phải. Slim fit nằm gần cơ thể hơn, trong khi relaxed fit có vai, thân hoặc ống rộng hơn. Cùng một số đo nhưng cảm giác mặc của ba phom này sẽ rất khác nhau.

Hãy xem thêm chiều cao, cân nặng và size người mẫu đang mặc. Đây là dữ liệu tham khảo hữu ích để hình dung độ dài và độ rộng thực tế của sản phẩm.

## Kiểm tra sau khi nhận hàng
Thử sản phẩm cùng loại trang phục bạn thường phối. Đứng, ngồi và vận động nhẹ để kiểm tra vai, nách, cạp và chiều dài. Sản phẩm đúng size cần giữ phom nhưng không tạo điểm căng hoặc hạn chế chuyển động.`,
  "news-003": `## Đọc nhãn trước lần giặt đầu tiên
Mỗi chất liệu phản ứng khác nhau với nước, nhiệt và lực vắt. Hướng dẫn trên nhãn sản phẩm luôn là thông tin cần ưu tiên. Một lần giặt sai nhiệt độ có thể làm co sợi, biến dạng phom hoặc khiến màu xuống nhanh.

Phân loại đồ theo màu và đặc tính bề mặt. Quần áo sáng màu không nên giặt chung với denim đậm trong những lần đầu; sản phẩm mỏng nên được đặt trong túi giặt và tách khỏi khóa kéo hoặc chi tiết sắc.

## Giặt nhẹ nhưng đủ sạch
Với trang phục mặc hằng ngày, nhiệt độ khoảng 30°C và chu trình nhẹ thường đã đủ. Lộn trái áo quần giúp giảm ma sát trực tiếp lên bề mặt, hình in và màu nhuộm.

Không cần dùng quá nhiều chất giặt. Lượng dư thừa có thể lưu lại trong sợi vải, làm bề mặt cứng và dễ gây kích ứng. Đồ thể thao cũng nên hạn chế nước xả đậm đặc vì có thể ảnh hưởng khả năng thoát ẩm.

## Phơi đúng để giữ phom
Tránh nắng gắt kéo dài, đặc biệt với màu đậm và vật liệu có sợi co giãn. Áo dệt kim hoặc sản phẩm dễ giãn nên phơi ngang; sơ mi và áo khoác nhẹ có thể treo trên móc có độ rộng phù hợp với vai.

Giũ nhẹ và chỉnh lại đường may trước khi phơi giúp sản phẩm ít nhăn hơn. Quần áo nên khô hoàn toàn trước khi cất để tránh mùi ẩm.

## Cất giữ có khoảng thở
Không ép quá nhiều quần áo vào cùng một ngăn tủ. Áo khoác, sơ mi và váy nên được treo với khoảng cách vừa đủ; áo thun và đồ dệt kim nên gấp để tránh kéo giãn vai.

Kiểm tra tủ định kỳ, giữ không gian khô và thoáng. Chăm sóc đúng không chỉ giúp sản phẩm đẹp lâu hơn mà còn giảm nhu cầu thay mới quá sớm.`,
};

function genericContent(article) {
  return `## Bắt đầu từ nhu cầu thật
${article.excerpt} Một lựa chọn phù hợp không chỉ đẹp ở thời điểm thử đồ mà còn cần thoải mái, dễ kết hợp và đồng hành được trong lịch trình thực tế.

## Chú ý đến chất liệu và phom dáng
Hãy đọc kỹ thành phần vật liệu, mô tả độ co giãn và kiểu dáng của sản phẩm. Những thông tin này giúp bạn dự đoán cảm giác mặc, khả năng vận động và cách sản phẩm thay đổi sau thời gian sử dụng.

## Thử trong nhiều hoàn cảnh
Một món đồ cơ bản tốt có thể kết hợp với nhiều phần còn lại trong tủ. Hãy hình dung ít nhất ba cách phối và kiểm tra xem sản phẩm có phù hợp với môi trường bạn sử dụng thường xuyên hay không.

## Chăm sóc để sử dụng lâu hơn
Luôn làm theo hướng dẫn trên nhãn, phân loại trước khi giặt và tránh nhiệt độ quá cao. Những thói quen nhỏ trong quá trình giặt, phơi và cất giữ sẽ giúp bề mặt, màu sắc và phom dáng bền hơn.`;
}

function parseSections(content) {
  return String(content || "")
    .split(/\n(?=##\s)/)
    .map((block) => {
      const lines = block.trim().split("\n");
      const title = lines[0]?.replace(/^##\s*/, "").trim();
      const paragraphs = lines.slice(1).join("\n").split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
      return { title, paragraphs };
    })
    .filter((section) => section.title && section.paragraphs.length);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" });
}

export default function NewsDetailPage() {
  const { identifier } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    window.scrollTo({ top: 0, behavior: "auto" });
    setLoading(true);
    api.get(`/news/${identifier}`)
      .then((result) => {
        if (!active) return;
        setArticle(result.data);
        setRelated(result.related || []);
      })
      .catch(() => api.get("/news").then((result) => {
        if (!active) return;
        const found = result.data.find((item) => item.id === identifier);
        if (!found) throw new Error("Bài viết không tồn tại hoặc chưa được xuất bản.");
        setArticle(found);
        setRelated(result.data.filter((item) => item.id !== found.id).slice(0, 3));
      }))
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [identifier]);

  const content = article?.content || fallbackContent[article?.id] || (article ? genericContent(article) : "");
  const sections = useMemo(() => parseSections(content), [content]);
  const readingMinutes = Math.max(4, Math.ceil(content.split(/\s+/).filter(Boolean).length / 180));

  if (loading) return <div className="journal-article-loading"><span /></div>;
  if (error || !article) return <section className="journal-article-error"><p>{error || "Không tìm thấy bài viết."}</p><Link to="/tin-tuc">← Quay lại Blog</Link></section>;

  const articlePath = `/tin-tuc/${article.id}`;

  return (
    <main className="journal-article-page">
      <Seo
        title={`${article.title} | NOVA Journal`}
        description={article.excerpt}
        canonical={articlePath}
        image={article.image}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: absoluteUrl(article.image),
          datePublished: article.publishedAt,
          mainEntityOfPage: absoluteUrl(articlePath),
          author: { "@type": "Organization", name: "NOVAWEAR" },
          publisher: { "@type": "Organization", name: "NOVAWEAR", logo: { "@type": "ImageObject", url: absoluteUrl("/brand-icon.svg") } },
        }}
      />
      <nav className="journal-article-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><Link to="/tin-tuc">Blog</Link><span>/</span><b>{article.category}</b></nav>
      <header className="journal-article-header">
        <p>{article.category} · {formatDate(article.publishedAt)}</p>
        <h1>{article.title}</h1>
        <div><span>{article.excerpt}</span><small>{readingMinutes} phút đọc</small></div>
      </header>

      <figure className="journal-article-cover">
        <SmartImage src={article.image} alt={article.title} loading="eager" />
        <figcaption>NOVA JOURNAL · {article.category.toUpperCase()}</figcaption>
      </figure>

      <div className="journal-article-layout">
        <aside>
          <p>TRONG BÀI VIẾT</p>
          <ol>{sections.map((section, index) => <li key={section.title}><a href={`#phan-${index + 1}`}><span>0{index + 1}</span>{section.title}</a></li>)}</ol>
          <div><span>Chia sẻ góc nhìn</span><p>Những ghi chú thực tế để mặc đẹp và dùng đồ lâu hơn.</p></div>
        </aside>
        <article className="journal-article-body">
          <p className="journal-article-lead">{article.excerpt}</p>
          {sections.map((section, index) => (
            <section id={`phan-${index + 1}`} key={section.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => <p key={`${section.title}-${paragraphIndex}`}>{paragraph}</p>)}
            </section>
          ))}
          <blockquote>Chọn đúng, mặc thường xuyên và chăm sóc cẩn thận — đó là cách đơn giản nhất để xây một tủ đồ tốt hơn.</blockquote>
        </article>
      </div>

      <section className="journal-article-shop">
        <div><p className="eyebrow">TỪ BÀI VIẾT ĐẾN TỦ ĐỒ</p><h2>Tìm những thiết kế phù hợp nhịp sống của bạn.</h2></div>
        <Link className="button button--dark" to="/cua-hang">Khám phá cửa hàng <span>→</span></Link>
      </section>

      {related.length > 0 && (
        <section className="journal-related">
          <header><p className="eyebrow">ĐỌC TIẾP</p><h2>Có thể bạn cũng quan tâm</h2></header>
          <div>{related.map((item) => <Link to={`/tin-tuc/${item.id}`} key={item.id}><SmartImage src={item.image} alt={item.title} /><span>{item.category}</span><h3>{item.title}</h3><b>Đọc bài →</b></Link>)}</div>
        </section>
      )}
    </main>
  );
}
