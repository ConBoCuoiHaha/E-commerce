import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/axios.js";

// Token nằm trong cookie httpOnly (JS không đọc được) -> muốn biết ai
// đang đăng nhập, gọi GET /auth/me. Nếu access token hết hạn (15 phút),
// thử gọi /auth/refresh một lần rồi gọi lại /me.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Cookie JWT là httpOnly nên JS không đọc được -> dùng 1 CỜ PHIÊN
      // (localStorage) đặt khi đăng nhập, xóa khi đăng xuất. Khách VÃNG
      // LAI (chưa từng đăng nhập) sẽ KHÔNG gọi /auth/me -> hết lỗi 401
      // đỏ trong console cho người dùng mới.
      if (localStorage.getItem("hsg_session") !== "1") {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch {
        try {
          await api.post("/auth/refresh");
          const res2 = await api.get("/auth/me");
          setUser(res2.data);
        } catch {
          localStorage.removeItem("hsg_session"); // phiên đã hết hiệu lực
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Lưu user + bật cờ phiên sau khi xác thực thành công
  const setSession = (data) => {
    localStorage.setItem("hsg_session", "1");
    setUser(data);
  };

  // identifier = username HOẶC email
  const login = async (identifier, password) => {
    const res = await api.post("/auth/login", { identifier, password });
    setSession(res.data);
  };

  const signup = async (name, username, email, password) => {
    const res = await api.post("/auth/signup", { name, username, email, password });
    setSession(res.data);
    return res.data; // chứa message nhắc xác thực email
  };

  // Đăng nhập Google: gửi ID token (credential) cho backend verify.
  const loginWithGoogle = async (credential) => {
    const res = await api.post("/auth/google", { credential });
    setSession(res.data);
    return res.data;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    localStorage.removeItem("hsg_session");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
