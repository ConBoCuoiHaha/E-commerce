import { useState } from "react";
import api from "../lib/axios.js";

// Ô upload ảnh dùng chung cho admin (sản phẩm, banner, QR ngân hàng).
// Chọn file -> POST /api/upload (multipart) -> nhận URL /api/images/<id>
// -> gọi onUploaded(url). Có xem trước + vẫn cho dán URL thủ công.
export default function UploadInput({ value, onUploaded, placeholder = "URL ảnh hoặc bấm Chọn ảnh" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      // FormData: định dạng multipart/form-data cho file
      const form = new FormData();
      form.append("image", file);
      const res = await api.post("/upload", form);
      onUploaded(res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || "Upload thất bại (chỉ nhận JPG/PNG/WEBP ≤ 2MB)");
    } finally {
      setUploading(false);
      e.target.value = ""; // cho phép chọn lại cùng 1 file
    }
  };

  return (
    <div className="field-group">
      <div className="upload-row">
        {value && <img className="preview" src={value} alt="xem trước" />}
        <input
          style={{ flex: 1, minWidth: 180 }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onUploaded(e.target.value)}
        />
        <label className="btn btn-sm" style={{ cursor: "pointer" }}>
          {uploading ? "Đang tải..." : "Chọn ảnh"}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFile} />
        </label>
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
