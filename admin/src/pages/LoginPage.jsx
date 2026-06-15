import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext.jsx";

// Trang đăng nhập riêng của khu quản trị (nền tối, khác hẳn web bán hàng).
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(identifier, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <form className="admin-login" onSubmit={handleSubmit}>
        <div className="admin-login-brand">
          <ShieldCheck size={30} weight="fill" />
          <div>
            <b>Hung<span>SaiGon</span></b>
            <div className="meta">Trang quản trị nội bộ</div>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <input
          required placeholder="Tên đăng nhập hoặc email quản trị"
          value={identifier} onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          type="password" required placeholder="Mật khẩu"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Đang đăng nhập..." : "Đăng nhập quản trị"}
        </button>
        <p className="meta" style={{ textAlign: "center" }}>
          Chỉ tài khoản có quyền quản trị mới truy cập được khu vực này.
        </p>
      </form>
    </div>
  );
}
