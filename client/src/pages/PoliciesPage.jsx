import React from "react";
import { Link, useParams } from "react-router-dom";
import { SectionHeading } from "../components/Common";

const POLICY_CONTENT = {
  "bao-mat": {
    eyebrow: "NOVA CARE \u00b7 PRIVACY",
    title: "Ch\u00ednh s\u00e1ch b\u1ea3o m\u1eadt",
    intro: "NOVAWEAR ch\u1ec9 s\u1eed d\u1ee5ng th\u00f4ng tin c\u1ea7n thi\u1ebft \u0111\u1ec3 x\u1eed l\u00fd \u0111\u01a1n h\u00e0ng, h\u1ed7 tr\u1ee3 kh\u00e1ch h\u00e0ng v\u00e0 b\u1ea3o v\u1ec7 t\u00e0i kho\u1ea3n c\u1ee7a b\u1ea1n.",
    sections: [
      ["Th\u00f4ng tin ch\u00fang t\u00f4i thu th\u1eadp", "H\u1ecd t\u00ean, email, s\u1ed1 \u0111i\u1ec7n tho\u1ea1i, \u0111\u1ecba ch\u1ec9 giao h\u00e0ng v\u00e0 th\u00f4ng tin \u0111\u01a1n h\u00e0ng \u0111\u01b0\u1ee3c d\u00f9ng \u0111\u1ec3 x\u00e1c nh\u1eadn, giao nh\u1eadn v\u00e0 ch\u0103m s\u00f3c sau mua. Th\u00f4ng tin thanh to\u00e1n chuy\u1ec3n kho\u1ea3n \u0111\u01b0\u1ee3c \u0111\u1ed1i so\u00e1t qua SePay; NOVAWEAR kh\u00f4ng l\u01b0u th\u00f4ng tin \u0111\u0103ng nh\u1eadp ng\u00e2n h\u00e0ng c\u1ee7a kh\u00e1ch h\u00e0ng."],
      ["M\u1ee5c \u0111\u00edch s\u1eed d\u1ee5ng", "Th\u00f4ng tin \u0111\u01b0\u1ee3c d\u00f9ng \u0111\u1ec3 x\u1eed l\u00fd \u0111\u01a1n, g\u1eedi th\u00f4ng b\u00e1o tr\u1ea1ng th\u00e1i, h\u1ed7 tr\u1ee3 \u0111\u1ed5i tr\u1ea3, ch\u1ed1ng gian l\u1eadn v\u00e0 c\u1ea3i thi\u1ec7n s\u1ea3n ph\u1ea9m. NOVAWEAR kh\u00f4ng b\u00e1n th\u00f4ng tin c\u00e1 nh\u00e2n cho b\u00ean th\u1ee9 ba."],
      ["L\u01b0u tr\u1eef v\u00e0 b\u1ea3o v\u1ec7", "M\u1eadt kh\u1ea9u \u0111\u01b0\u1ee3c b\u0103m tr\u01b0\u1edbc khi l\u01b0u. M\u00e3 x\u00e1c minh ch\u1ec9 d\u00f9ng m\u1ed9t l\u1ea7n v\u00e0 t\u1ef1 h\u1ebft h\u1ea1n. D\u1eef li\u1ec7u v\u1eadn h\u00e0nh \u0111\u01b0\u1ee3c l\u01b0u tr\u00ean c\u01a1 s\u1edf d\u1eef li\u1ec7u production \u0111\u00e3 c\u1ea5u h\u00ecnh; quy\u1ec1n truy c\u1eadp \u0111\u01b0\u1ee3c gi\u1edbi h\u1ea1n theo vai tr\u00f2."],
      ["Quy\u1ec1n c\u1ee7a kh\u00e1ch h\u00e0ng", "B\u1ea1n c\u00f3 th\u1ec3 y\u00eau c\u1ea7u xem, s\u1eeda ho\u1eb7c c\u1eadp nh\u1eadt th\u00f4ng tin h\u1ed3 s\u01a1. N\u1ebfu c\u1ea7n x\u00f3a t\u00e0i kho\u1ea3n, h\u00e3y li\u00ean h\u1ec7 NOVAWEAR \u0111\u1ec3 ch\u00fang t\u00f4i x\u1eed l\u00fd c\u00e1c ngh\u0129a v\u1ee5 li\u00ean quan \u0111\u1ebfn \u0111\u01a1n h\u00e0ng v\u00e0 k\u1ebf to\u00e1n tr\u01b0\u1edbc khi x\u00f3a d\u1eef li\u1ec7u."],
    ],
  },
  "dieu-khoan": {
    eyebrow: "NOVA CARE \u00b7 TERMS",
    title: "\u0110i\u1ec1u kho\u1ea3n mua h\u00e0ng",
    intro: "Khi \u0111\u1eb7t h\u00e0ng t\u1ea1i NOVAWEAR, kh\u00e1ch h\u00e0ng x\u00e1c nh\u1eadn th\u00f4ng tin nh\u1eadn h\u00e0ng l\u00e0 ch\u00ednh x\u00e1c v\u00e0 \u0111\u1ed3ng \u00fd v\u1edbi c\u00e1c \u0111i\u1ec1u kho\u1ea3n d\u01b0\u1edbi \u0111\u00e2y.",
    sections: [
      ["\u0110\u1eb7t h\u00e0ng v\u00e0 x\u00e1c nh\u1eadn", "\u0110\u01a1n h\u00e0ng ch\u1ec9 \u0111\u01b0\u1ee3c xem l\u00e0 h\u1ee3p l\u1ec7 sau khi h\u1ec7 th\u1ed1ng ghi nh\u1eadn \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin s\u1ea3n ph\u1ea9m, ng\u01b0\u1eddi nh\u1eadn v\u00e0 ph\u01b0\u01a1ng th\u1ee9c thanh to\u00e1n. \u0110\u01a1n chuy\u1ec3n kho\u1ea3n \u0111\u01b0\u1ee3c x\u00e1c nh\u1eadn sau khi SePay ghi nh\u1eadn \u0111\u00fang s\u1ed1 ti\u1ec1n v\u00e0 n\u1ed9i dung giao d\u1ecbch."],
      ["Gi\u00e1 v\u00e0 \u01b0u \u0111\u00e3i", "Gi\u00e1 hi\u1ec3n th\u1ecb t\u1ea1i th\u1eddi \u0111i\u1ec3m \u0111\u1eb7t h\u00e0ng l\u00e0 c\u0103n c\u1ee9 t\u00ednh ti\u1ec1n. M\u00e3 \u01b0u \u0111\u00e3i ph\u1ea3i c\u00f2n hi\u1ec7u l\u1ef1c, \u0111\u00fang \u0111i\u1ec1u ki\u1ec7n v\u00e0 \u0111\u01b0\u1ee3c h\u1ec7 th\u1ed1ng x\u00e1c nh\u1eadn \u1edf b\u01b0\u1edbc thanh to\u00e1n. Quy\u1ec1n l\u1ee3i th\u00e0nh vi\u00ean \u0111\u01b0\u1ee3c \u00e1p d\u1ee5ng theo h\u1ea1ng hi\u1ec3n th\u1ecb trong t\u00e0i kho\u1ea3n."],
      ["H\u1ee7y \u0111\u01a1n v\u00e0 thanh to\u00e1n", "Kh\u00e1ch c\u00f3 th\u1ec3 h\u1ee7y \u0111\u01a1n tr\u01b0\u1edbc khi \u0111\u01a1n \u0111\u01b0\u1ee3c b\u00e0n giao v\u1eadn chuy\u1ec3n. V\u1edbi \u0111\u01a1n \u0111\u00e3 thanh to\u00e1n, kho\u1ea3n ti\u1ec1n s\u1ebd chuy\u1ec3n sang tr\u1ea1ng th\u00e1i ch\u1edd ho\u00e0n v\u00e0 \u0111\u01b0\u1ee3c x\u1eed l\u00fd theo ph\u01b0\u01a1ng th\u1ee9c ho\u00e0n ti\u1ec1n \u0111\u00e3 \u0111\u1ed1i so\u00e1t."],
      ["T\u00e0i kho\u1ea3n v\u00e0 h\u00e0nh vi s\u1eed d\u1ee5ng", "Kh\u00e1ch h\u00e0ng ch\u1ecbu tr\u00e1ch nhi\u1ec7m b\u1ea3o m\u1eadt t\u00e0i kho\u1ea3n v\u00e0 kh\u00f4ng \u0111\u01b0\u1ee3c t\u1ea1o \u0111\u01a1n gi\u1ea3, l\u1ea1m d\u1ee5ng m\u00e3 gi\u1ea3m gi\u00e1 ho\u1eb7c g\u1eedi n\u1ed9i dung vi ph\u1ea1m ph\u00e1p lu\u1eadt qua h\u1ec7 th\u1ed1ng h\u1ed7 tr\u1ee3."],
    ],
  },
  "giao-hang-doi-tra": {
    eyebrow: "NOVA CARE \u00b7 DELIVERY",
    title: "Giao h\u00e0ng & \u0111\u1ed5i tr\u1ea3",
    intro: "M\u1ed7i \u0111\u01a1n h\u00e0ng \u0111\u1ec1u c\u00f3 m\u00e3 tra c\u1ee9u v\u00e0 l\u1ecbch s\u1eed x\u1eed l\u00fd \u0111\u1ec3 kh\u00e1ch h\u00e0ng theo d\u00f5i t\u1eeb l\u00fac ti\u1ebfp nh\u1eadn \u0111\u1ebfn khi giao th\u00e0nh c\u00f4ng.",
    sections: [
      ["Giao h\u00e0ng", "\u0110\u01a1n \u0111\u01b0\u1ee3c \u0111\u00f3ng g\u00f3i sau khi x\u00e1c nh\u1eadn. Khi b\u00e0n giao, h\u1ec7 th\u1ed1ng c\u1eadp nh\u1eadt \u0111\u01a1n v\u1ecb v\u1eadn chuy\u1ec3n, m\u00e3 v\u1eadn \u0111\u01a1n v\u00e0 th\u1eddi gian d\u1ef1 ki\u1ebfn giao. Th\u1eddi gian th\u1ef1c t\u1ebf c\u00f3 th\u1ec3 thay \u0111\u1ed5i theo khu v\u1ef1c, th\u1eddi ti\u1ebft v\u00e0 n\u0103ng l\u1ef1c c\u1ee7a h\u00e3ng v\u1eadn chuy\u1ec3n."],
      ["Ki\u1ec3m tra khi nh\u1eadn", "Kh\u00e1ch h\u00e0ng n\u00ean ki\u1ec3m tra t\u00ean s\u1ea3n ph\u1ea9m, m\u00e0u, size v\u00e0 t\u00ecnh tr\u1ea1ng bao b\u00ec tr\u01b0\u1edbc khi thanh to\u00e1n COD. N\u1ebfu c\u00f3 d\u1ea5u hi\u1ec7u b\u1ea5t th\u01b0\u1eddng, h\u00e3y ghi nh\u1eadn v\u1edbi \u0111\u01a1n v\u1ecb v\u1eadn chuy\u1ec3n v\u00e0 li\u00ean h\u1ec7 NOVAWEAR ngay."],
      ["\u0110\u1ed5i ho\u1eb7c tr\u1ea3", "Y\u00eau c\u1ea7u \u0111\u1ed5i tr\u1ea3 ch\u1ec9 \u0111\u01b0\u1ee3c t\u1ea1o sau khi \u0111\u01a1n giao th\u00e0nh c\u00f4ng, trong th\u1eddi h\u1ea1n 30 ng\u00e0y v\u00e0 s\u1ea3n ph\u1ea9m c\u00f2n nguy\u00ean t\u00ecnh tr\u1ea1ng ph\u00f9 h\u1ee3p. Kh\u00e1ch c\u1ea7n ch\u1ecdn \u0111\u00fang s\u1ea3n ph\u1ea9m, l\u00fd do v\u00e0 g\u1eedi h\u00ecnh \u1ea3nh b\u1eb1ng ch\u1ee9ng n\u1ebfu \u0111\u01b0\u1ee3c y\u00eau c\u1ea7u."],
      ["X\u1eed l\u00fd ho\u00e0n ti\u1ec1n", "Sau khi kho ki\u1ec3m tra s\u1ea3n ph\u1ea9m, NOVAWEAR c\u1eadp nh\u1eadt k\u1ebft qu\u1ea3 tr\u00ean t\u00e0i kho\u1ea3n v\u00e0 email. Kho\u1ea3n ho\u00e0n \u0111\u01b0\u1ee3c ghi nh\u1eadn b\u1eb1ng m\u00e3 \u0111\u1ed1i so\u00e1t; th\u1eddi gian ti\u1ec1n v\u1ec1 ph\u1ee5 thu\u1ed9c v\u00e0o ng\u00e2n h\u00e0ng ho\u1eb7c ph\u01b0\u01a1ng th\u1ee9c thanh to\u00e1n."],
    ],
  },
};

export default function PoliciesPage() {
  const { section = "bao-mat" } = useParams();
  const policy = POLICY_CONTENT[section] || POLICY_CONTENT["bao-mat"];

  return (
    <main className="policy-page">
      <section className="policy-page__hero">
        <p className="eyebrow">{policy.eyebrow}</p>
        <h1>{policy.title}</h1>
        <p>{policy.intro}</p>
      </section>

      <nav className="policy-page__tabs" aria-label={"C\u00e1c ch\u00ednh s\u00e1ch"}>
        <Link className={section === "bao-mat" ? "is-active" : ""} to="/chinh-sach/bao-mat">{"B\u1ea3o m\u1eadt"}</Link>
        <Link className={section === "dieu-khoan" ? "is-active" : ""} to="/chinh-sach/dieu-khoan">{"\u0110i\u1ec1u kho\u1ea3n"}</Link>
        <Link className={section === "giao-hang-doi-tra" ? "is-active" : ""} to="/chinh-sach/giao-hang-doi-tra">{"Giao h\u00e0ng & \u0111\u1ed5i tr\u1ea3"}</Link>
      </nav>

      <section className="policy-page__content">
        <SectionHeading eyebrow="NOVA STANDARD" title={"Th\u00f4ng tin c\u1ea7n bi\u1ebft"} copy={"C\u00e1c ch\u00ednh s\u00e1ch \u0111\u01b0\u1ee3c tr\u00ecnh b\u00e0y r\u00f5 r\u00e0ng \u0111\u1ec3 b\u1ea1n ch\u1ee7 \u0111\u1ed9ng tr\u01b0\u1edbc, trong v\u00e0 sau khi mua h\u00e0ng."} />
        <div className="policy-page__sections">
          {policy.sections.map(([title, copy], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{title}</h2>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="policy-page__contact">
          {"C\u1ea7n h\u1ed7 tr\u1ee3 th\u00eam? "}
          <Link to="/ho-tro">{"Li\u00ean h\u1ec7 NOVAWEAR"}</Link>
          {" ho\u1eb7c g\u1ecdi "}
          <a href="tel:19000000">1900 0000</a>.
        </p>
      </section>
    </main>
  );
}
