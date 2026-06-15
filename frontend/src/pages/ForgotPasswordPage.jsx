import { useState } from "react";
import api from "../lib/axios.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post("/auth/forgot-password", { email });
    // Backend luôn trả thông báo chung chung (chống dò email)
    setMessage(res.data.message);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Quên mật khẩu</h1>
      {message ? (
        <p className="success-text">{message}</p>
      ) : (
        <>
          <p className="info-text" style={{ margin: 0 }}>
            Nhập email đã đăng ký - chúng tôi sẽ gửi link đặt lại mật khẩu (hiệu lực 15 phút).
          </p>
          <input type="email" required placeholder="Email của bạn" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn-primary">Gửi link đặt lại</button>
        </>
      )}
    </form>
  );
}
