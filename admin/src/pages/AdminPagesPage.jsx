import { useEffect, useState } from "react";
import api from "../lib/axios.js";

// Quản lý bài viết "Thông tin hữu ích" (v5) - admin sửa nội dung
// chính sách, footer + trang bài viết tự cập nhật.
export default function AdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [editing, setEditing] = useState(null); // page đang sửa (null = tạo mới ẩn)
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.get("/pages/all").then((r) => setPages(r.data));
  useEffect(() => { load(); }, []);

  const startEdit = (p) => {
    setEditing({ ...p });
    setMsg("");
    setError("");
    window.scrollTo(0, 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = {
        title: editing.title,
        content: editing.content,
        order: Number(editing.order) || 0,
        isActive: editing.isActive,
      };
      if (editing._id) await api.put(`/pages/${editing._id}`, body);
      else await api.post("/pages", body);
      setMsg("Đã lưu bài viết");
      setEditing(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu bài viết");
    }
  };

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Bài viết ({pages.length})</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => startEdit({ title: "", content: "", order: pages.length + 1, isActive: true })}
        >
          + Bài viết mới
        </button>
      </div>
      {msg && <p className="success-text">{msg}</p>}

      {editing && (
        <form className="auth-form wide" onSubmit={handleSave}>
          <h2>{editing._id ? `Sửa: ${editing.title}` : "Bài viết mới"}</h2>
          {error && <p className="error-text">{error}</p>}
          <label className="field">Tiêu đề
            <input required minLength={2} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </label>
          <label className="field">
            Nội dung — quy ước: dòng "### Tên mục" thành tiêu đề, dòng "- ..." thành gạch đầu dòng
            <textarea
              required minLength={10} style={{ minHeight: 280, fontFamily: "monospace", fontSize: 13 }}
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label className="field">Thứ tự
              <input type="number" style={{ width: 90 }} value={editing.order} onChange={(e) => setEditing({ ...editing, order: e.target.value })} />
            </label>
            <label className="facet-option" style={{ alignSelf: "flex-end" }}>
              <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
              Hiển thị công khai
            </label>
          </div>
          <div className="form-row">
            <button className="btn btn-primary">Lưu bài viết</button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Đóng</button>
          </div>
        </form>
      )}

      <table className="table">
        <thead><tr><th>Tiêu đề</th><th>Slug</th><th>Thứ tự</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p._id}>
              <td><b>{p.title}</b></td>
              <td className="meta">/chinh-sach/{p.slug}</td>
              <td>{p.order}</td>
              <td>
                <span className={`status-chip ${p.isActive ? "s-delivered" : "s-cancelled"}`}>
                  {p.isActive ? "Hiển thị" : "Đã ẩn"}
                </span>
              </td>
              <td><button className="btn btn-sm" onClick={() => startEdit(p)}>Sửa</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
