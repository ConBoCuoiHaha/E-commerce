import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Chặn truy cập khu quản trị nếu chưa đăng nhập hoặc không phải admin.
// (Bảo vệ THẬT vẫn ở backend - mọi API admin có requireAdmin.)
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p className="info-text" style={{ padding: 24 }}>Đang tải...</p>;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return <Outlet />;
}
