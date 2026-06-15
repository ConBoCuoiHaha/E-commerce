import { useState } from "react";
import { SealCheck, SealWarning } from "@phosphor-icons/react";
import api from "../../lib/axios.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePageMeta } from "../../lib/usePageMeta.js";

// HỒ SƠ CÁ NHÂN: xem thông tin + đổi tên + đổi mật khẩu.
// Tài khoản đăng nhập bằng Google chưa có mật khẩu -> form "đổi mật
// khẩu" chính là cách ĐẶT mật khẩu lần đầu (backend dùng chung API).
export default function ProfilePage() {
  usePageMeta("Hồ sơ cá nhân");
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    if (password && password !== confirm) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    try {
      const body = {};
      if (name && name !== user.name) body.name = name;
      if (password) body.password = password;
      if (Object.keys(body).length === 0) {
        setMsg("Không có gì thay đổi");
        return;
      }
      await api.put("/auth/profile", body);
      setMsg("Đã lưu thay đổi. " + (password ? "Mật khẩu mới có hiệu lực từ lần đăng nhập sau." : ""));
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu hồ sơ");
    }
  };

  return (
    <div>
      <h1>Hồ sơ cá nhân</h1>

      {/* Thông tin chỉ đọc */}
      <div className="order-card">
        <table className="specs">
          <tbody>
            <tr><td>Tên đăng nhập</td><td><b>@{user?.username}</b></td></tr>
            <tr>
              <td>Email</td>
              <td>
                {user?.email}{" "}
                {user?.isEmailVerified ? (
                  <span className="success-text"><SealCheck size={14} style={{ verticalAlign: "-2px" }} /> Đã xác thực</span>
                ) : (
                  <span className="error-text"><SealWarning size={14} style={{ verticalAlign: "-2px" }} /> Chưa xác thực — kiểm tra hộp thư</span>
                )}
              </td>
            </tr>
            <tr><td>Vai trò</td><td>{user?.role === "admin" ? "Quản trị viên" : "Khách hàng"}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Form chỉnh sửa */}
      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h2>Chỉnh sửa thông tin</h2>
        {msg && <p className="success-text">{msg}</p>}
        {error && <p className="error-text">{error}</p>}
        <label className="field">Họ tên hiển thị
          <input minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">Mật khẩu mới (bỏ trống nếu không đổi)
          <input type="password" minLength={6} placeholder="Tối thiểu 6 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {password && (
          <label className="field">Nhập lại mật khẩu mới
            <input type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
        )}
        <button className="btn btn-primary">Lưu thay đổi</button>
      </form>
    </div>
  );
}
