import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(identifier, password); // username HOẶC email đều được
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Đăng nhập</h1>
      {error && <p className="error-text">{error}</p>}
      <input
        required
        placeholder="Tên đăng nhập hoặc email"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <input
        type="password" required placeholder="Mật khẩu"
        value={password} onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn btn-primary">Đăng nhập</button>

      <div className="or-divider"><span>hoặc</span></div>
      <GoogleSignInButton onError={setError} />

      <p className="info-text" style={{ margin: 0 }}>
        <Link to="/forgot-password" style={{ color: "var(--accent)" }}>Quên mật khẩu?</Link>
      </p>
      <p className="info-text" style={{ margin: 0 }}>
        Chưa có tài khoản? <Link to="/register" style={{ color: "var(--accent)" }}>Đăng ký</Link>
      </p>
    </form>
  );
}
