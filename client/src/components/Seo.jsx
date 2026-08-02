import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "NOVAWEAR";
const DEFAULT_TITLE = "NOVAWEAR — Đồ mặc đẹp. Sống nhẹ tênh.";
const DEFAULT_DESCRIPTION = "Khám phá thời trang nam nữ tối giản, dễ mặc và phù hợp nhịp sống Việt tại NOVAWEAR.";
const DEFAULT_IMAGE = "/og-novawear.png";

function siteOrigin() {
  return String(process.env.REACT_APP_SITE_URL || window.location.origin).replace(/\/$/, "");
}

function absoluteUrl(value) {
  if (!value) return `${siteOrigin()}${DEFAULT_IMAGE}`;
  try {
    return new URL(value, `${siteOrigin()}/`).toString();
  } catch (_error) {
    return `${siteOrigin()}${DEFAULT_IMAGE}`;
  }
}

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical = window.location.pathname,
  image = DEFAULT_IMAGE,
  type = "website",
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  jsonLd,
}) {
  const canonicalUrl = absoluteUrl(canonical);
  const imageUrl = absoluteUrl(image);
  const structuredData = useMemo(() => (
    jsonLd ? JSON.stringify(jsonLd) : ""
  ), [jsonLd]);

  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "vi_VN");
    setMeta("property", "og:type", type);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    const scriptId = "novawear-structured-data";
    let script = document.getElementById(scriptId);
    if (structuredData) {
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = structuredData;
    } else {
      script?.remove();
    }
  }, [canonicalUrl, description, imageUrl, robots, structuredData, title, type]);

  return null;
}

const STATIC_ROUTES = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: SITE_NAME,
          url: `${siteOrigin()}/`,
          logo: `${siteOrigin()}/brand-icon.svg`,
        },
        {
          "@type": "WebSite",
          name: SITE_NAME,
          url: `${siteOrigin()}/`,
          potentialAction: {
            "@type": "SearchAction",
            target: `${siteOrigin()}/cua-hang?search={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ],
    },
  },
  "/cua-hang": { title: "Cửa hàng thời trang nam nữ | NOVAWEAR", description: "Mua sắm áo, quần, đồ thể thao, phụ kiện và nhiều danh mục thời trang nam nữ tại NOVAWEAR." },
  "/uu-dai": { title: "Ưu đãi và mã giảm giá | NOVAWEAR", description: "Khám phá sản phẩm đang giảm giá và các mã ưu đãi còn hiệu lực tại NOVAWEAR." },
  "/chon-size": { title: "Hướng dẫn chọn size quần áo | NOVAWEAR", description: "Đối chiếu số đo và chọn size quần áo phù hợp với phom dáng sản phẩm NOVAWEAR." },
  "/tin-tuc": { title: "NOVA Journal — Phong cách và chăm sóc trang phục", description: "Bài viết thực tế về phối đồ, chọn size, chất liệu và cách chăm sóc quần áo." },
  "/ve-chung-toi": { title: "Về NOVAWEAR", description: "Tìm hiểu câu chuyện, định hướng thiết kế và cách NOVAWEAR xây dựng những sản phẩm dễ mặc lâu dài." },
  "/ho-tro": { title: "Trung tâm hỗ trợ | NOVAWEAR", description: "Tra cứu đơn hàng, tư vấn size, giao hàng, đổi trả và liên hệ đội ngũ NOVAWEAR." },
  "/doi-tra": { title: "Chính sách đổi trả | NOVAWEAR", description: "Thông tin và quy trình đổi trả sản phẩm NOVAWEAR rõ ràng, thuận tiện." },
};

const PRIVATE_PATHS = [
  "/gio-hang", "/thanh-toan", "/tai-khoan", "/yeu-thich", "/tra-cuu",
  "/dat-hang-thanh-cong", "/dang-nhap", "/dang-ky", "/oauth/callback",
];

export function RouteSeo() {
  const { pathname } = useLocation();
  const staticConfig = STATIC_ROUTES[pathname];
  const isPrivate = PRIVATE_PATHS.some((path) => pathname.startsWith(path));
  const lifestyle = pathname.startsWith("/phong-cach/")
    ? { title: "Gợi ý trang phục theo nhịp sống | NOVAWEAR", description: "Khám phá những lựa chọn trang phục phù hợp ngày thường, vận động và cuối tuần." }
    : null;

  return (
    <Seo
      {...(staticConfig || lifestyle || {})}
      canonical={pathname}
      robots={isPrivate ? "noindex,nofollow" : undefined}
    />
  );
}

export { absoluteUrl };
