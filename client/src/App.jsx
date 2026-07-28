import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ShopProvider } from "./context/ShopContext";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import WishlistPage from "./pages/WishlistPage";
import TrackingPage from "./pages/TrackingPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AboutPage from "./pages/AboutPage";
import SizeGuidePage from "./pages/SizeGuidePage";
import SupportPage from "./pages/SupportPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <ShopProvider>
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
        <Route path="/DangNhap" element={<Navigate to="/dang-nhap" replace />} />
        <Route path="/DangKy" element={<Navigate to="/dang-ky" replace />} />
      </Routes>
    </ShopProvider>
  );
}
