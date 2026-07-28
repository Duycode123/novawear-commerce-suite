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

