import { useEffect, useState } from "react";
import api from "../lib/axios.js";
import UploadInput from "../components/UploadInput.jsx";

// Cài đặt cửa hàng (v5): mọi thông tin footer + tài khoản ngân hàng
// nhận thanh toán. Shop đổi địa điểm/hotline/số tài khoản -> sửa ở
// đây, toàn website tự cập nhật.
export default function AdminSettingsPage() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/settings").then((r) => setForm(r.data));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const { _id, key, createdAt, updatedAt, __v, ...body } = form;
      await api.put("/settings", body);
      setMsg("Đã lưu cài đặt. Footer và trang thanh toán đã dùng thông tin mới.");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu cài đặt");
    }
  };

  if (!form) return <p className="info-text">Đang tải...</p>;

  return (
    <div>
      <h1>Cài đặt cửa hàng</h1>
      <form className="auth-form wide" onSubmit={handleSubmit}>
        {msg && <p className="success-text">{msg}</p>}
        {error && <p className="error-text">{error}</p>}

        <h2>Thông tin liên hệ (hiện ở footer)</h2>
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>Hotline
            <input value={form.hotline} onChange={(e) => set("hotline", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 2 }}>Email liên hệ
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label className="field" style={{ flex: 2 }}>Địa chỉ cửa hàng
            <input value={form.storeAddress} onChange={(e) => set("storeAddress", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>Tỉnh/Thành
            <input value={form.storeCity} onChange={(e) => set("storeCity", e.target.value)} />
          </label>
        </div>
        <label className="field">Dòng bản quyền (chân trang)
          <textarea value={form.copyright} onChange={(e) => set("copyright", e.target.value)} />
        </label>
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>Facebook
            <input value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>YouTube
            <input value={form.youtube} onChange={(e) => set("youtube", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>TikTok
            <input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} />
          </label>
        </div>

        <h2>Tài khoản nhận thanh toán chuyển khoản</h2>
        <p className="meta">
          Hiển thị ở trang thanh toán của khách. Khách chuyển khoản kèm mã đơn,
          hệ thống tự đối soát email báo có của ngân hàng.
        </p>
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>Ngân hàng
            <input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>Số tài khoản
            <input value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber", e.target.value)} />
          </label>
        </div>
        <label className="field">Chủ tài khoản
          <input value={form.bankAccountHolder} onChange={(e) => set("bankAccountHolder", e.target.value)} />
        </label>
        <label className="field">Ảnh mã QR thanh toán
          <UploadInput value={form.bankQrImage} onUploaded={(url) => set("bankQrImage", url)} placeholder="Upload ảnh QR ngân hàng" />
        </label>

        <button className="btn btn-primary">Lưu cài đặt</button>
      </form>
    </div>
  );
}
