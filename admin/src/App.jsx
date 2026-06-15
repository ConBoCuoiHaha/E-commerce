import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminLayout from "./pages/AdminLayout.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminStatsPage from "./pages/AdminStatsPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import AdminOrdersPage from "./pages/AdminOrdersPage.jsx";
import AdminCategoriesPage from "./pages/AdminCategoriesPage.jsx";
import AdminCouponsPage from "./pages/AdminCouponsPage.jsx";
import AdminBannersPage from "./pages/AdminBannersPage.jsx";
import AdminPagesPage from "./pages/AdminPagesPage.jsx";
import AdminFeedbackPage from "./pages/AdminFeedbackPage.jsx";
import AdminSettingsPage from "./pages/AdminSettingsPage.jsx";
import InventoryOverviewPage from "./pages/InventoryOverviewPage.jsx";
import SuppliersPage from "./pages/SuppliersPage.jsx";
import AccountingSettingsPage from "./pages/AccountingSettingsPage.jsx";
import StudentVerifyPage from "./pages/StudentVerifyPage.jsx";
import PricingCalculatorPage from "./pages/PricingCalculatorPage.jsx";
import LcnrvPage from "./pages/LcnrvPage.jsx";

// App QUẢN TRỊ ĐỘC LẬP: routes ở cấp gốc (không tiền tố /admin).
// Login công khai; mọi trang nghiệp vụ nằm sau ProtectedRoute (admin).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="stats" element={<AdminStatsPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="pages" element={<AdminPagesPage />} />
          <Route path="feedback" element={<AdminFeedbackPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          {/* Kế toán - Kho hàng (v10-P2) */}
          <Route path="inventory" element={<InventoryOverviewPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="pricing" element={<PricingCalculatorPage />} />
          <Route path="lcnrv" element={<LcnrvPage />} />
          <Route path="students" element={<StudentVerifyPage />} />
          <Route path="accounting" element={<AccountingSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
