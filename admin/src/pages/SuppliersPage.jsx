import { useEffect, useState } from "react";
import { Plus, Trash, Truck } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

// TAB 2 - NHÀ CUNG CẤP & NHẬP KHO (v10-P2)
// Trên: danh sách NCC + công nợ + form thêm NCC.
// Dưới: form NHẬP LÔ HÀNG (chọn NCC + thêm dòng sản phẩm/biến thể) +
// lịch sử lô nhập. Server tự tính tổng tiền (gồm VAT) + tăng tồn kho.
const EMPTY_SUPPLIER = { name: "", phone: "", contactName: "", email: "", address: "", taxCode: "", paymentTerms: "COD" };
const EMPTY_LINE = { product: "", variantId: "", quantityImported: "", importPrice: "", vatRatePct: "10" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [supForm, setSupForm] = useState(EMPTY_SUPPLIER);
  const [showSupForm, setShowSupForm] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Form nhập lô
  const [batchSupplier, setBatchSupplier] = useState("");
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [amountPaid, setAmountPaid] = useState("0");
  const [batchError, setBatchError] = useState("");

  const load = () => {
    api.get("/inventory/suppliers").then((r) => setSuppliers(r.data));
    api.get("/products/admin/all").then((r) => setProducts(r.data));
    api.get("/inventory/batches", { params: { limit: 10 } }).then((r) => setBatches(r.data.batches));
  };
  useEffect(load, []);

  // --- Thêm NCC ---
  const submitSupplier = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const body = { ...supForm };
      Object.keys(body).forEach((k) => body[k] === "" && delete body[k]);
      await api.post("/inventory/suppliers", body);
      setSupForm(EMPTY_SUPPLIER);
      setShowSupForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi thêm NCC");
    }
  };

  const deleteSupplier = async (id) => {
    if (!confirm("Xóa nhà cung cấp này?")) return;
    try { await api.delete(`/inventory/suppliers/${id}`); load(); }
    catch (err) { alert(err.response?.data?.message || "Không xóa được"); }
  };

  // --- Nhập lô ---
  const setLine = (i, k, v) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines((ls) => [...ls, { ...EMPTY_LINE }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submitBatch = async (e) => {
    e.preventDefault();
    setBatchError("");
    setMsg("");
    try {
      const items = lines
        .filter((l) => l.product && l.quantityImported && l.importPrice)
        .map((l) => ({
          product: l.product,
          ...(l.variantId ? { variantId: l.variantId } : {}),
          quantityImported: Number(l.quantityImported),
          importPrice: Number(l.importPrice),
          vatRatePct: Number(l.vatRatePct) || 0,
        }));
      if (items.length === 0) { setBatchError("Thêm ít nhất 1 dòng hàng hợp lệ"); return; }
      const res = await api.post("/inventory/batches", {
        supplier: batchSupplier,
        amountPaid: Number(amountPaid) || 0,
        items,
      });
      setMsg(`Đã nhập lô ${formatVND(res.totalAmount)} (${res.paymentStatus}). Tồn kho đã cập nhật.`);
      setLines([{ ...EMPTY_LINE }]);
      setAmountPaid("0");
      setBatchSupplier("");
      load();
    } catch (err) {
      setBatchError(err.response?.data?.message || "Lỗi nhập lô");
    }
  };

  // Lấy biến thể của 1 sản phẩm đã chọn (cho dropdown variant)
  const variantsOf = (productId) => products.find((p) => p._id === productId)?.variants || [];

  return (
    <div>
      <h1>Nhà cung cấp & Nhập kho</h1>

      {/* ===== Nhà cung cấp ===== */}
      <div className="section-head">
        <h2 style={{ margin: 0 }}>Nhà cung cấp ({suppliers.length})</h2>
        <button className="btn btn-sm btn-primary" onClick={() => setShowSupForm((v) => !v)}>
          <Plus size={14} /> {showSupForm ? "Đóng" : "Thêm NCC"}
        </button>
      </div>

      {showSupForm && (
        <form className="auth-form wide" onSubmit={submitSupplier}>
          {error && <p className="error-text">{error}</p>}
          <div className="form-row">
            <input required placeholder="Tên nhà cung cấp" value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} style={{ flex: 2 }} />
            <input required placeholder="SĐT (10 số)" value={supForm.phone} onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} />
          </div>
          <div className="form-row">
            <input placeholder="Người liên hệ" value={supForm.contactName} onChange={(e) => setSupForm({ ...supForm, contactName: e.target.value })} />
            <input placeholder="Email" value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} />
            <input placeholder="Mã số thuế" value={supForm.taxCode} onChange={(e) => setSupForm({ ...supForm, taxCode: e.target.value })} />
          </div>
          <div className="form-row">
            <input placeholder="Địa chỉ" value={supForm.address} onChange={(e) => setSupForm({ ...supForm, address: e.target.value })} style={{ flex: 2 }} />
            <select value={supForm.paymentTerms} onChange={(e) => setSupForm({ ...supForm, paymentTerms: e.target.value })}>
              <option value="COD">COD (trả ngay)</option>
              <option value="NET30">NET30 (nợ 30 ngày)</option>
              <option value="NET60">NET60 (nợ 60 ngày)</option>
            </select>
          </div>
          <button className="btn btn-primary">Lưu nhà cung cấp</button>
        </form>
      )}

      <table className="table">
        <thead><tr><th>Tên</th><th>Liên hệ</th><th>Điều khoản</th><th>Công nợ</th><th></th></tr></thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s._id}>
              <td><b>{s.name}</b>{s.taxCode && <div className="meta">MST: {s.taxCode}</div>}</td>
              <td>{s.contactName || "—"}<div className="meta">{s.phone}</div></td>
              <td>{s.paymentTerms}</td>
              <td className={s.debt > 0 ? "price" : "meta"}>{formatVND(s.debt)}</td>
              <td><button className="btn btn-sm" onClick={() => deleteSupplier(s._id)}><Trash size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== Nhập lô hàng ===== */}
      <h2 style={{ marginTop: 26 }}><Truck size={18} style={{ verticalAlign: "-3px" }} /> Nhập lô hàng mới</h2>
      <form className="auth-form wide" onSubmit={submitBatch}>
        {batchError && <p className="error-text">{batchError}</p>}
        {msg && <p className="success-text">{msg}</p>}
        <select required value={batchSupplier} onChange={(e) => setBatchSupplier(e.target.value)}>
          <option value="">-- Chọn nhà cung cấp --</option>
          {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>

        <b>Các dòng hàng (giá nhập chưa gồm VAT)</b>
        {lines.map((l, i) => (
          <div className="form-row" key={i}>
            <select required value={l.product} onChange={(e) => setLine(i, "product", e.target.value)} style={{ flex: 2 }}>
              <option value="">-- Sản phẩm --</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
            {variantsOf(l.product).length > 0 && (
              <select required value={l.variantId} onChange={(e) => setLine(i, "variantId", e.target.value)} style={{ flex: 1.5 }}>
                <option value="">-- Biến thể --</option>
                {variantsOf(l.product).map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            )}
            <input required type="number" min="1" placeholder="SL" value={l.quantityImported} onChange={(e) => setLine(i, "quantityImported", e.target.value)} style={{ width: 70 }} />
            <input required type="number" min="0" placeholder="Giá nhập" value={l.importPrice} onChange={(e) => setLine(i, "importPrice", e.target.value)} />
            <input type="number" min="0" max="100" placeholder="VAT%" value={l.vatRatePct} onChange={(e) => setLine(i, "vatRatePct", e.target.value)} style={{ width: 70 }} />
            {lines.length > 1 && <button type="button" className="btn btn-sm" onClick={() => removeLine(i)}>✕</button>}
          </div>
        ))}
        <button type="button" className="btn btn-sm" onClick={addLine}>+ Thêm dòng</button>

        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>Đã trả NCC (đ)
            <input type="number" min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary">Kết chuyển nhập kho</button>
      </form>

      {/* ===== Lịch sử lô nhập ===== */}
      <h2 style={{ marginTop: 22 }}>Lô nhập gần đây</h2>
      <table className="table">
        <thead><tr><th>Ngày nhập</th><th>NCC</th><th>Số dòng</th><th>Tổng tiền</th><th>Thanh toán</th></tr></thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b._id}>
              <td>{new Date(b.importDate).toLocaleDateString("vi-VN")}{b.isOpeningBalance && <span className="meta"> (mở sổ)</span>}</td>
              <td>{b.supplier?.name}</td>
              <td>{b.items.length}</td>
              <td className="price">{formatVND(b.totalAmount)}</td>
              <td><span className={`status-chip ${b.paymentStatus === "PAID" ? "s-delivered" : b.paymentStatus === "UNPAID" ? "s-cancelled" : "s-pending"}`}>{b.paymentStatus}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
