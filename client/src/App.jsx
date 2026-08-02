import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ShopProvider } from "./context/ShopContext";
import HomePage from "./pages/HomePage";
import { ToastViewport } from "./components/Common";
import { RouteSeo } from "./components/Seo";

const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const TrackingPage = lazy(() => import("./pages/TrackingPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const SizeGuidePage = lazy(() => import("./pages/SizeGuidePage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const NewsDetailPage = lazy(() => import("./pages/NewsDetailPage"));
const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage"));
const PoliciesPage = lazy(() => import("./pages/PoliciesPage"));
const LifestylePage = lazy(() => import("./pages/LifestylePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));

function RouteFallback() {
  return <div className="route-loading" role="status" aria-live="polite"><span />Đang mở trang…</div>;
}

export default function App() {
  return (
    <ShopProvider>
      <RouteSeo />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/cua-hang" element={<CatalogPage />} />
          <Route path="/san-pham/:identifier" element={<ProductPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/tai-khoan" element={<AccountPage />} />
          <Route path="/yeu-thich" element={<WishlistPage />} />
          <Route path="/tra-cuu" element={<TrackingPage />} />
          <Route path="/dat-hang-thanh-cong" element={<OrderSuccessPage />} />
          <Route path="/ve-chung-toi" element={<AboutPage />} />
          <Route path="/chon-size" element={<SizeGuidePage />} />
          <Route path="/ho-tro" element={<SupportPage />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/tin-tuc/:identifier" element={<NewsDetailPage />} />
          <Route path="/uu-dai" element={<PromotionsPage />} />
          <Route path="/doi-tra" element={<ReturnsPage />} />
          <Route path="/chinh-sach/:section" element={<PoliciesPage />} />
          <Route path="/phong-cach/:style" element={<LifestylePage />} />

          <Route path="/product" element={<Navigate to="/cua-hang" replace />} />
          <Route path="/detail/:identifier" element={<ProductPage />} />
          <Route path="/cart" element={<Navigate to="/gio-hang" replace />} />
          <Route path="/about" element={<Navigate to="/ve-chung-toi" replace />} />
          <Route path="/chonsize" element={<Navigate to="/chon-size" replace />} />
          <Route path="/donhang" element={<Navigate to="/tai-khoan" replace />} />
          <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="/thanh-toan" element={<CheckoutPage />} />
          <Route path="/dang-nhap" element={<AuthPage mode="login" />} />
          <Route path="/dang-ky" element={<AuthPage mode="register" />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/DangNhap" element={<Navigate to="/dang-nhap" replace />} />
          <Route path="/DangKy" element={<Navigate to="/dang-ky" replace />} />
        </Routes>
      </Suspense>
      <ToastViewport />
    </ShopProvider>
  );
}
