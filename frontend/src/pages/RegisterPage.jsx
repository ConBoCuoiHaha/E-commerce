import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";

export default function RegisterPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await signup(form.name, form.username, form.email, form.password);
      alert(res.message || "Đăng ký thành công! Kiểm tra email để xác thực tài khoản.");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Đăng ký</h1>
      {error && <p className="error-text">{error}</p>}
      <input required minLength={2} name="name" placeholder="Họ tên" value={form.name} onChange={handleChange} />
      <input
        required minLength={3} name="username" placeholder="Tên đăng nhập (chữ thường, số, _)"
        pattern="[a-z0-9_]+" title="Chỉ gồm chữ thường, số và dấu gạch dưới"
        value={form.username} onChange={handleChange}
      />
      <input type="email" required name="email" placeholder="Email (sẽ nhận thư xác thực)" value={form.email} onChange={handleChange} />
      <input type="password" required minLength={6} name="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={form.password} onChange={handleChange} />
      <button className="btn btn-primary">Đăng ký</button>

      <div className="or-divider"><span>hoặc</span></div>
      <GoogleSignInButton onError={setError} />

      <p className="info-text" style={{ margin: 0 }}>
        Đã có tài khoản? <Link to="/login" style={{ color: "var(--accent)" }}>Đăng nhập</Link>
      </p>
    </form>
  );
}
