import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/AdminLayout";
import { AdminProvider, useAdmin } from "./context/AdminContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WorkspacePage from "./pages/WorkspacePage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import InventoryPage from "./pages/InventoryPage";
import PurchasesPage from "./pages/PurchasesPage";
import CustomersPage from "./pages/CustomersPage";
import EmployeesPage from "./pages/EmployeesPage";
import AccountsPage from "./pages/AccountsPage";
import SupportInboxPage from "./pages/SupportInboxPage";
import NewsPage from "./pages/NewsPage";

function ProtectedLayout() {
  const { user } = useAdmin();
  return user ? <AdminLayout /> : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAdmin();
  return user?.role === "admin" ? children : <Navigate to="/workspace" replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={process.env.REACT_APP_BASENAME || (process.env.NODE_ENV === "production" ? "/ops" : undefined)}>
      <AdminProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/support" element={<SupportInboxPage />} />
            <Route path="/news" element={<AdminOnly><NewsPage /></AdminOnly>} />
            <Route path="/employees" element={<AdminOnly><EmployeesPage /></AdminOnly>} />
            <Route path="/accounts" element={<AdminOnly><AccountsPage /></AdminOnly>} />
            <Route path="/Indexhd" element={<Navigate to="/orders" replace />} />
            <Route path="/Indexsp" element={<Navigate to="/products" replace />} />
            <Route path="/Indexdm" element={<Navigate to="/categories" replace />} />
            <Route path="/Indexkhohang" element={<Navigate to="/inventory" replace />} />
            <Route path="/Indexkh" element={<Navigate to="/customers" replace />} />
            <Route path="/Indexnv" element={<Navigate to="/employees" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AdminProvider>
    </BrowserRouter>
  );
}
