import { useEffect, useState } from "react";
import { Star } from "@phosphor-icons/react";
import api from "../../lib/axios.js";
import { PROVINCES } from "../../lib/provinces.js";
import { usePageMeta } from "../../lib/usePageMeta.js";

// SỔ ĐỊA CHỈ GIAO HÀNG (v7): thêm / xóa / đặt mặc định (tối đa 5).
// Backend đã có sẵn CRUD từ v3 - đây là giao diện quản lý đầy đủ
// (trước chỉ dùng được ở trang checkout).
const EMPTY = { fullName: "", phone: "", address: "", city: "", isDefault: false };

export default function AddressesPage() {
  usePageMeta("Sổ địa chỉ");
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/addresses").then((r) => setAddresses(r.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/addresses", form);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu địa chỉ");
    }
  };

  const setDefault = async (a) => {
    await api.put(`/addresses/${a._id}`, { isDefault: true });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Xóa địa chỉ này?")) return;
    await api.delete(`/addresses/${id}`);
    load();
  };

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Sổ địa chỉ ({addresses.length}/5)</h1>
        {addresses.length < 5 && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Đóng" : "+ Thêm địa chỉ"}
          </button>
        )}
      </div>

      {showForm && (
        <form className="auth-form wide" onSubmit={handleSubmit}>
          {error && <p className="error-text">{error}</p>}
          <input required minLength={2} placeholder="Họ tên người nhận" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          <input required pattern="0\d{9}" title="10 số, bắt đầu bằng 0" placeholder="Số điện thoại" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          <input required minLength={5} placeholder="Địa chỉ: số nhà, tên đường, phường/xã" value={form.address} onChange={(e) => set("address", e.target.value)} />
          <select required value={form.city} onChange={(e) => set("city", e.target.value)}>
            <option value="">-- Chọn Tỉnh/Thành phố --</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <label className="facet-option">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} />
            Đặt làm địa chỉ mặc định
          </label>
          <button className="btn btn-primary">Lưu địa chỉ</button>
        </form>
      )}

      {addresses.length === 0 && !showForm && (
        <p className="info-text">Chưa có địa chỉ nào. Thêm địa chỉ để đặt hàng nhanh hơn.</p>
      )}

      {addresses.map((a) => (
        <div key={a._id} className="order-card">
          <div className="order-head">
            <span>
              <b>{a.fullName}</b> · {a.phone}
              {a.isDefault && (
                <span className="status-chip s-confirmed" style={{ marginLeft: 8 }}>
                  <Star size={11} weight="fill" style={{ verticalAlign: "-1px" }} /> Mặc định
                </span>
              )}
            </span>
          </div>
          <p>{a.address}, {a.city}</p>
          <div className="form-row" style={{ marginTop: 8 }}>
            {!a.isDefault && (
              <button className="btn btn-sm" onClick={() => setDefault(a)}>Đặt làm mặc định</button>
            )}
            <button className="btn btn-sm" onClick={() => handleDelete(a._id)}>Xóa</button>
          </div>
        </div>
      ))}
    </div>
  );
}
