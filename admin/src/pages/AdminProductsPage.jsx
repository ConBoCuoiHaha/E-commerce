import { useEffect, useState } from "react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";
import UploadInput from "../components/UploadInput.jsx";

// Form trống mặc định
const EMPTY = {
  name: "", description: "", category: "", image: "",
  brand: "", cpu: "", gpu: "", ram: "", storage: "", screenSize: "", needs: "",
  isFeatured: false,
  variants: [{ name: "", sku: "", price: "", countInStock: "" }],
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    // v8: API riêng cho admin - thấy CẢ sản phẩm đã ẩn (để hiện lại/xóa hẳn)
    api.get("/products/admin/all").then((r) => setProducts(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
  };
  useEffect(load, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // --- Sửa dòng biến thể ---
  const setVariant = (idx, key, value) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === idx ? { ...v, [key]: value } : v)),
    }));
  const addVariantRow = () =>
    setForm((f) => ({ ...f, variants: [...f.variants, { name: "", sku: "", price: "", countInStock: "" }] }));
  const removeVariantRow = (idx) =>
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // Dựng body đúng schema backend: attributes lồng + variants ép kiểu số
    const body = {
      name: form.name,
      description: form.description,
      category: form.category,
      ...(form.image ? { image: form.image } : {}),
      isFeatured: form.isFeatured,
      attributes: {
        ...(form.brand ? { brand: form.brand } : {}),
        ...(form.cpu ? { cpu: form.cpu } : {}),
        ...(form.gpu ? { gpu: form.gpu } : {}),
        ...(form.ram ? { ram: form.ram } : {}),
        ...(form.storage ? { storage: form.storage } : {}),
        ...(form.screenSize ? { screenSize: Number(form.screenSize) } : {}),
        ...(form.needs ? { needs: form.needs.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      },
      variants: form.variants
        .filter((v) => v.name && v.sku)
        .map((v) => ({
          name: v.name,
          sku: v.sku,
          price: Number(v.price),
          countInStock: Number(v.countInStock),
        })),
    };
    try {
      if (editingId) await api.put(`/products/${editingId}`, body);
      else await api.post("/products", body);
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu sản phẩm");
    }
  };

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      category: p.category?._id || p.category,
      image: p.image,
      brand: p.attributes?.brand || "",
      cpu: p.attributes?.cpu || "",
      gpu: p.attributes?.gpu || "",
      ram: p.attributes?.ram || "",
      storage: p.attributes?.storage || "",
      screenSize: p.attributes?.screenSize || "",
      needs: (p.attributes?.needs || []).join(", "),
      isFeatured: !!p.isFeatured,
      variants: p.variants?.length
        ? p.variants.map((v) => ({
            name: v.name, sku: v.sku,
            price: String(v.price), countInStock: String(v.countInStock),
          }))
        : [{ name: "", sku: "", price: "", countInStock: "" }],
    });
    window.scrollTo(0, 0);
  };

  // Ẩn / hiện lại sản phẩm (soft delete - giữ lịch sử bán hàng)
  const toggleActive = async (p) => {
    if (p.isActive) {
      if (!confirm(`Ẩn "${p.name}" khỏi cửa hàng? (có thể hiện lại sau)`)) return;
      await api.delete(`/products/${p._id}`);
    } else {
      await api.put(`/products/${p._id}`, { isActive: true }); // bật bán lại
    }
    load();
  };

  // Xóa HẲN (chỉ được khi chưa có đơn hàng tham chiếu - server kiểm tra)
  const handleHardDelete = async (p) => {
    if (!confirm(`XÓA HẲN "${p.name}"? Hành động không thể hoàn tác. (Sản phẩm đã có đơn hàng sẽ bị từ chối - dùng nút Ẩn thay thế)`)) return;
    try {
      const res = await api.delete(`/products/${p._id}/hard`);
      alert(res.data.message);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Không xóa được");
    }
  };

  return (
    <div>
      <h1>Quản lý sản phẩm</h1>

      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h2>{editingId ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
        {error && <p className="error-text">{error}</p>}

        <input required name="name" placeholder="Tên sản phẩm" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <textarea required minLength={10} placeholder="Mô tả (ít nhất 10 ký tự)" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <select required value={form.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">-- Danh mục --</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        {/* v5: upload ảnh trực tiếp (lưu vào MongoDB) thay vì chỉ dán URL */}
        <UploadInput value={form.image} onUploaded={(url) => set("image", url)} placeholder="Ảnh sản phẩm: dán URL hoặc bấm Chọn ảnh" />

        <b>Thuộc tính (phục vụ bộ lọc)</b>
        <div className="form-row">
          <input placeholder="Hãng" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          <input placeholder="CPU" value={form.cpu} onChange={(e) => set("cpu", e.target.value)} />
          <input placeholder="GPU" value={form.gpu} onChange={(e) => set("gpu", e.target.value)} />
        </div>
        <div className="form-row">
          <input placeholder="RAM (vd 16GB)" value={form.ram} onChange={(e) => set("ram", e.target.value)} />
          <input placeholder="Lưu trữ (vd 512GB SSD)" value={form.storage} onChange={(e) => set("storage", e.target.value)} />
          <input type="number" step="0.1" placeholder="Màn hình (inch)" value={form.screenSize} onChange={(e) => set("screenSize", e.target.value)} />
        </div>
        <input placeholder="Nhu cầu, cách nhau dấu phẩy (vd: gaming, vanphong)" value={form.needs} onChange={(e) => set("needs", e.target.value)} />

        <b>Biến thể (mỗi dòng: tên / SKU / giá / tồn kho)</b>
        {form.variants.map((v, i) => (
          <div className="form-row" key={i}>
            <input required placeholder="Tên (vd i5/16GB/512GB)" value={v.name} onChange={(e) => setVariant(i, "name", e.target.value)} style={{ flex: 2 }} />
            <input required placeholder="SKU" value={v.sku} onChange={(e) => setVariant(i, "sku", e.target.value)} />
            <input required type="number" min="0" placeholder="Giá" value={v.price} onChange={(e) => setVariant(i, "price", e.target.value)} />
            <input required type="number" min="0" placeholder="Tồn" value={v.countInStock} onChange={(e) => setVariant(i, "countInStock", e.target.value)} style={{ width: 80 }} />
            {form.variants.length > 1 && (
              <button type="button" className="btn btn-sm" onClick={() => removeVariantRow(i)}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={addVariantRow}>+ Thêm biến thể</button>

        <label className="facet-option">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
          Sản phẩm nổi bật (hiện trang chủ)
        </label>

        <div className="form-row">
          <button className="btn btn-primary">{editingId ? "Lưu thay đổi" : "Thêm sản phẩm"}</button>
          {editingId && (
            <button type="button" className="btn" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Hủy sửa</button>
          )}
        </div>
      </form>

      <table className="table">
        <thead>
          <tr><th>Tên</th><th>Giá từ</th><th>Tồn</th><th>Danh mục</th><th>Biến thể</th><th>Trạng thái</th><th></th></tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} style={!p.isActive ? { opacity: 0.6 } : {}}>
              <td>{p.name}</td>
              <td>{formatVND(p.price)}</td>
              <td>{p.countInStock}</td>
              <td>{p.category?.name}</td>
              <td>{p.variants?.length || 0}</td>
              <td>
                <span className={`status-chip ${p.isActive ? "s-delivered" : "s-cancelled"}`}>
                  {p.isActive ? "Đang bán" : "Đã ẩn"}
                </span>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="btn btn-sm" onClick={() => startEdit(p)}>Sửa</button>{" "}
                <button className="btn btn-sm" onClick={() => toggleActive(p)}>
                  {p.isActive ? "Ẩn" : "Hiện"}
                </button>{" "}
                <button className="btn btn-sm" style={{ color: "var(--price)", borderColor: "var(--price)" }} onClick={() => handleHardDelete(p)}>
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
