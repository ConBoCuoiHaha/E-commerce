import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import ComparePage from "./pages/ComparePage.jsx";
import PolicyPage from "./pages/PolicyPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import AccountLayout from "./pages/account/AccountLayout.jsx";
import ProfilePage from "./pages/account/ProfilePage.jsx";
import AddressesPage from "./pages/account/AddressesPage.jsx";
import VouchersPage from "./pages/account/VouchersPage.jsx";
import MembershipPage from "./pages/account/MembershipPage.jsx";

// v10: KHU QUẢN TRỊ ĐÃ TÁCH RA APP RIÊNG (thư mục admin/, cổng 5174).
// Web bán hàng này KHÔNG còn chứa bất kỳ mã nguồn quản trị nào -> bảo
// mật hơn (người mua không thể tải/đọc code admin từ bundle cửa hàng).

// Layout CỬA HÀNG: navbar + nội dung + footer (người mua thấy)
function StoreLayout() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/chinh-sach/:slug" element={<PolicyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />

          {/* DASHBOARD KHÁCH HÀNG: hồ sơ, đơn hàng, địa chỉ, voucher */}
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="orders" element={<MyOrdersPage />} />
            <Route path="membership" element={<MembershipPage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
          </Route>
          {/* Đường dẫn cũ /my-orders -> chuyển hướng vào khu tài khoản */}
          <Route path="/my-orders" element={<Navigate to="/account/orders" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
