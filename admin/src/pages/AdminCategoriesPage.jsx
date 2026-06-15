import { useEffect, useState } from "react";
import api from "../lib/axios.js";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.get("/categories").then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) await api.put(`/categories/${editingId}`, form);
      else await api.post("/categories", form);
      setForm({ name: "", description: "" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu danh mục");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa danh mục này? (không xóa được nếu còn sản phẩm)")) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Không xóa được");
    }
  };

  return (
    <div>
      <h1>Danh mục ({categories.length})</h1>

      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h2>{editingId ? "Sửa danh mục" : "Thêm danh mục"}</h2>
        {error && <p className="error-text">{error}</p>}
        <input required minLength={2} placeholder="Tên danh mục" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Mô tả (tùy chọn)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="form-row">
          <button className="btn btn-primary">{editingId ? "Lưu" : "Thêm"}</button>
          {editingId && (
            <button type="button" className="btn" onClick={() => { setEditingId(null); setForm({ name: "", description: "" }); }}>Hủy</button>
          )}
        </div>
      </form>

      <table className="table">
        <thead><tr><th>Tên</th><th>Slug</th><th>Mô tả</th><th></th></tr></thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c._id}>
              <td>{c.icon} {c.name}</td>
              <td className="meta">{c.slug}</td>
              <td className="meta">{c.description}</td>
              <td>
                <button className="btn btn-sm" onClick={() => { setEditingId(c._id); setForm({ name: c.name, description: c.description }); window.scrollTo(0, 0); }}>Sửa</button>{" "}
                <button className="btn btn-sm" onClick={() => handleDelete(c._id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
