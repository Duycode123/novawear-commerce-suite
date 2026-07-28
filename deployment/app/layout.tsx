import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVAWEAR — Đồ mặc đẹp. Sống nhẹ tênh.",
  description:
    "Trang phục thường nhật có chất liệu dễ chịu, phom dáng linh hoạt và tinh thần riêng.",
  icons: {
    icon: "/brand-icon.svg",
    shortcut: "/brand-icon.svg",
  },
  openGraph: {
    title: "NOVAWEAR — Đồ mặc đẹp. Sống nhẹ tênh.",
    description: "Trang phục thường nhật có chất liệu dễ chịu, phom dáng linh hoạt và tinh thần riêng.",
    type: "website",
    images: [{ url: "/og-novawear.png", width: 1731, height: 909, alt: "NOVAWEAR — Move with intent" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-novawear.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
