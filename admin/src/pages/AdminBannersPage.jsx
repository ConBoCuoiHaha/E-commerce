import { useEffect, useState } from "react";
import api from "../lib/axios.js";
import UploadInput from "../components/UploadInput.jsx";

const EMPTY = { title: "", subtitle: "", image: "", link: "/products", buttonLabel: "Xem ngay", order: "0" };

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const load = () => api.get("/banners/all").then((r) => setBanners(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/banners", {
        title: form.title,
        subtitle: form.subtitle || undefined,
        image: form.image || undefined,
        link: form.link || undefined,
        buttonLabel: form.buttonLabel || undefined,
        order: Number(form.order) || 0,
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tạo banner");
    }
  };

  const toggleActive = async (b) => {
    await api.put(`/banners/${b._id}`, { isActive: !b.isActive });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa banner này?")) return;
    await api.delete(`/banners/${id}`);
    load();
  };

  return (
    <div>
      <h1>Banner trang chủ ({banners.length})</h1>
      <p className="info-text">
        Banner không có ảnh sẽ dùng nền trang trí mặc định (mây + vòng ưu đãi).
        Nhiều banner đang bật sẽ tự chạy carousel 5 giây/slide.
      </p>

      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h2>Thêm banner</h2>
        {error && <p className="error-text">{error}</p>}
        <input required minLength={2} placeholder="Tiêu đề lớn" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <input placeholder="Dòng mô tả phụ" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        <UploadInput value={form.image} onUploaded={(url) => set("image", url)} placeholder="Ảnh nền banner (bỏ trống = nền trang trí)" />
        <input placeholder="Link khi bấm (vd /products?category=laptop)" value={form.link} onChange={(e) => set("link", e.target.value)} />
        <div className="form-row">
          <input placeholder="Nhãn nút" value={form.buttonLabel} onChange={(e) => set("buttonLabel", e.target.value)} />
          <input type="number" placeholder="Thứ tự" value={form.order} onChange={(e) => set("order", e.target.value)} style={{ width: 100 }} />
        </div>
        <button className="btn btn-primary">Thêm banner</button>
      </form>

      <table className="table">
        <thead><tr><th>Tiêu đề</th><th>Link</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b._id}>
              <td><b>{b.title}</b><div className="meta">{b.subtitle}</div></td>
              <td className="meta">{b.link}</td>
              <td>{b.order}</td>
              <td>
                <span className={`status-chip ${b.isActive ? "s-delivered" : "s-cancelled"}`}>
                  {b.isActive ? "Đang hiện" : "Đã ẩn"}
                </span>
              </td>
              <td>
                <button className="btn btn-sm" onClick={() => toggleActive(b)}>{b.isActive ? "Ẩn" : "Hiện"}</button>{" "}
                <button className="btn btn-sm" onClick={() => handleDelete(b._id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
