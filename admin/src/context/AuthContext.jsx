import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/axios.js";

// AuthContext cho app QUẢN TRỊ: chỉ chấp nhận tài khoản role=admin.
// Dùng chung backend với web bán hàng (cookie JWT httpOnly), nhưng
// đây là app riêng nên người mua không bao giờ tải được code này.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi mở app: chỉ hỏi /auth/me khi có CỜ PHIÊN (đặt lúc đăng nhập).
  // Cờ riêng cho khu quản trị ("hsg_admin") -> chưa đăng nhập admin thì
  // không gọi API auth -> hết lỗi 401/refresh đỏ ngoài console.
  useEffect(() => {
    const init = async () => {
      if (localStorage.getItem("hsg_admin") !== "1") {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        if (res.data.role === "admin") setUser(res.data);
        else localStorage.removeItem("hsg_admin");
      } catch {
        try {
          await api.post("/auth/refresh");
          const res2 = await api.get("/auth/me");
          if (res2.data.role === "admin") setUser(res2.data);
          else localStorage.removeItem("hsg_admin");
        } catch {
          localStorage.removeItem("hsg_admin");
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Đăng nhập: nếu đúng nhưng KHÔNG phải admin -> từ chối vào khu quản trị.
  const login = async (identifier, password) => {
    const res = await api.post("/auth/login", { identifier, password });
    if (res.data.role !== "admin") {
      await api.post("/auth/logout").catch(() => {});
      throw new Error("Tài khoản này không có quyền truy cập trang quản trị");
    }
    localStorage.setItem("hsg_admin", "1");
    setUser(res.data);
  };

  const logout = async () => {
    await api.post("/auth/logout");
    localStorage.removeItem("hsg_admin");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
