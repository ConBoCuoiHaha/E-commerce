import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Chặn route phía client (trải nghiệm). Bảo mật thật nằm ở backend:
// gọi thẳng API không qua giao diện vẫn bị 401/403.
export default function ProtectedRoute({ adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="info-text">Đang tải...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
