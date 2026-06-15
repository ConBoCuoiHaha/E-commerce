import { useEffect, useState } from "react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

const EMPTY = {
  code: "", description: "", discountType: "percent", discountValue: "",
  maxDiscount: "", minOrderValue: "", usageLimit: "100", expiresAt: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const load = () => api.get("/coupons").then((r) => setCoupons(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/coupons", {
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        usageLimit: Number(form.usageLimit) || 100,
        expiresAt: form.expiresAt,
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tạo mã");
    }
  };

  const toggleActive = async (c) => {
    await api.put(`/coupons/${c._id}`, { isActive: !c.isActive });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa mã giảm giá này?")) return;
    await api.delete(`/coupons/${id}`);
    load();
  };

  return (
    <div>
      <h1>Mã giảm giá ({coupons.length})</h1>

      <form className="auth-form wide" onSubmit={handleSubmit}>
        <h2>Tạo mã mới</h2>
        {error && <p className="error-text">{error}</p>}
        <div className="form-row">
          <input required placeholder="Mã (vd HSSV10)" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} style={{ textTransform: "uppercase" }} />
          <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)}>
            <option value="percent">Giảm theo %</option>
            <option value="fixed">Giảm số tiền</option>
          </select>
          <input required type="number" min="1" placeholder={form.discountType === "percent" ? "% giảm (1-100)" : "Số tiền giảm"} value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} />
        </div>
        <div className="form-row">
          {form.discountType === "percent" && (
            <input type="number" min="0" placeholder="Giảm tối đa (₫, 0 = không trần)" value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />
          )}
          <input type="number" min="0" placeholder="Đơn tối thiểu (₫)" value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} />
          <input type="number" min="1" placeholder="Số lượt dùng" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} />
          <input required type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
        </div>
        <input placeholder="Mô tả (tùy chọn)" value={form.description} onChange={(e) => set("description", e.target.value)} />
        <button className="btn btn-primary">Tạo mã</button>
      </form>

      <table className="table">
        <thead><tr><th>Mã</th><th>Giảm</th><th>Điều kiện</th><th>Lượt dùng</th><th>Hết hạn</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c._id}>
              <td><b>{c.code}</b><div className="meta">{c.description}</div></td>
              <td>
                {c.discountType === "percent" ? `${c.discountValue}%` : formatVND(c.discountValue)}
                {c.maxDiscount > 0 && <div className="meta">tối đa {formatVND(c.maxDiscount)}</div>}
              </td>
              <td className="meta">{c.minOrderValue > 0 ? `Đơn từ ${formatVND(c.minOrderValue)}` : "Không"}</td>
              <td>{c.usedCount}/{c.usageLimit}</td>
              <td className="meta">{new Date(c.expiresAt).toLocaleDateString("vi-VN")}</td>
              <td>
                <span className={`status-chip ${c.isActive ? "s-delivered" : "s-cancelled"}`}>
                  {c.isActive ? "Đang bật" : "Đã tắt"}
                </span>
              </td>
              <td>
                <button className="btn btn-sm" onClick={() => toggleActive(c)}>{c.isActive ? "Tắt" : "Bật"}</button>{" "}
                <button className="btn btn-sm" onClick={() => handleDelete(c._id)}>Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
