import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/axios.js";

// Trang đích của link email reset: /reset-password?id=...&token=...
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    try {
      const res = await api.post("/auth/reset-password", {
        id: params.get("id"),
        token: params.get("token"),
        password,
      });
      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Đặt lại mật khẩu thất bại");
    }
  };

  if (!params.get("id") || !params.get("token")) {
    return (
      <div className="auth-form" style={{ textAlign: "center" }}>
        <p className="error-text">Link không hợp lệ</p>
        <Link to="/forgot-password" className="btn">Gửi lại link</Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Đặt lại mật khẩu</h1>
      {error && <p className="error-text">{error}</p>}
      <input type="password" required minLength={6} placeholder="Mật khẩu mới" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="password" required minLength={6} placeholder="Nhập lại mật khẩu mới" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <button className="btn btn-primary">Đổi mật khẩu</button>
    </form>
  );
}
