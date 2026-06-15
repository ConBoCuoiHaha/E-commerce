import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../lib/axios.js";

// Trang đích của link trong email xác thực: /verify-email?id=...&token=...
// Tự động gọi API verify khi mở trang.
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading"); // loading | ok | fail
  const [message, setMessage] = useState("");

  useEffect(() => {
    const id = params.get("id");
    const token = params.get("token");
    if (!id || !token) {
      setStatus("fail");
      setMessage("Link không hợp lệ - thiếu thông tin xác thực");
      return;
    }
    api
      .post("/auth/verify-email", { id, token })
      .then((res) => { setStatus("ok"); setMessage(res.data.message); })
      .catch((err) => {
        setStatus("fail");
        setMessage(err.response?.data?.message || "Xác thực thất bại");
      });
  }, [params]);

  return (
    <div className="auth-form" style={{ textAlign: "center" }}>
      <h1>Xác thực email</h1>
      {status === "loading" && <p className="info-text">Đang xác thực...</p>}
      {status === "ok" && <p className="success-text">✅ {message}</p>}
      {status === "fail" && <p className="error-text">❌ {message}</p>}
      <Link to="/" className="btn btn-primary">Về trang chủ</Link>
    </div>
  );
}
