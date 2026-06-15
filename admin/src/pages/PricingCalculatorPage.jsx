import { useEffect, useState } from "react";
import { Calculator, CheckCircle } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

// TAB 3 - MÁY TÍNH ĐỊNH GIÁ ĐỘNG (v10-P4)
// Chọn sản phẩm -> tự lấy C0 (lô FIFO gần nhất) -> nhập N + các tỷ lệ
// -> tính P* tối ưu + mô phỏng giá sau chiết khấu + nút áp giá lên web.
export default function PricingCalculatorPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [n, setN] = useState("25");
  // Để trống các tỷ lệ = dùng mặc định cấu hình kế toán
  const [over, setOver] = useState({ mPct: "", gtPct: "", rpPct: "", lnPct: "", fc: "", pe: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState("");

  useEffect(() => {
    api.get("/products/admin/all").then((r) => setProducts(r.data));
  }, []);

  const variants = products.find((p) => p._id === productId)?.variants || [];

  const calc = async (e) => {
    e?.preventDefault();
    setError(""); setApplied("");
    try {
      const body = { productId, n: Number(n) };
      if (variantId) body.variantId = variantId;
      ["mPct", "gtPct", "rpPct", "lnPct", "fc", "pe"].forEach((k) => {
        if (over[k] !== "") body[k] = Number(over[k]);
      });
      const res = await api.post("/accounting/price-calc", body);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi tính giá");
      setResult(null);
    }
  };

  const apply = async () => {
    try {
      await api.post("/accounting/apply-price", {
        productId, ...(variantId ? { variantId } : {}), price: result.optimalPrice,
      });
      setApplied(`Đã áp giá ${formatVND(result.optimalPrice)} lên website.`);
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi áp giá");
    }
  };

  return (
    <div>
      <h1><Calculator size={22} style={{ verticalAlign: "-4px" }} /> Máy tính định giá động</h1>
      <p className="meta">P* = (C0 + FC/N + đóng gói) / (1 − %M − %Gt − %Rp − %Ln). Bỏ trống tỷ lệ = dùng cấu hình mặc định.</p>

      <form className="auth-form wide" onSubmit={calc}>
        {error && <p className="error-text">{error}</p>}
        <div className="form-row">
          <select required value={productId} onChange={(e) => { setProductId(e.target.value); setVariantId(""); setResult(null); }} style={{ flex: 2 }}>
            <option value="">-- Chọn sản phẩm --</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          {variants.length > 0 && (
            <select required value={variantId} onChange={(e) => setVariantId(e.target.value)} style={{ flex: 1.5 }}>
              <option value="">-- Biến thể --</option>
              {variants.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          )}
          <label className="field">Doanh số/tháng (N)<input type="number" min="1" value={n} onChange={(e) => setN(e.target.value)} style={{ width: 110 }} /></label>
        </div>
        <div className="form-row">
          <label className="field">%Marketing<input type="number" step="0.1" placeholder="mặc định" value={over.mPct} onChange={(e) => setOver({ ...over, mPct: e.target.value })} /></label>
          <label className="field">%Cổng TT<input type="number" step="0.1" placeholder="mặc định" value={over.gtPct} onChange={(e) => setOver({ ...over, gtPct: e.target.value })} /></label>
          <label className="field">%Dự phòng<input type="number" step="0.1" placeholder="mặc định" value={over.rpPct} onChange={(e) => setOver({ ...over, rpPct: e.target.value })} /></label>
          <label className="field">%Lợi nhuận<input type="number" step="0.1" placeholder="mặc định" value={over.lnPct} onChange={(e) => setOver({ ...over, lnPct: e.target.value })} /></label>
        </div>
        <button className="btn btn-primary">Tính giá tối ưu</button>
      </form>

      {result && (
        <div className="order-card" style={{ marginTop: 16 }}>
          {applied && <p className="success-text"><CheckCircle size={15} style={{ verticalAlign: "-2px" }} /> {applied}</p>}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="num">{formatVND(result.optimalPrice)}</div>
              <div className="lbl">Giá niêm yết tối ưu (P*)</div>
            </div>
            <div className="stat-card">
              <div className="num">{formatVND(result.c0)}</div>
              <div className="lbl">Giá vốn C0 (lô gần nhất)</div>
            </div>
            <div className="stat-card">
              <div className="num">{formatVND(result.grossProfit)}</div>
              <div className="lbl">Lợi nhuận gộp danh nghĩa ({result.grossMarginPct}%)</div>
            </div>
          </div>

          <h2>Mô phỏng giá sau chiết khấu</h2>
          <table className="table">
            <thead><tr><th>Mức ưu đãi</th><th>Giảm</th><th>Giá bán</th><th>Lợi nhuận gộp</th></tr></thead>
            <tbody>
              {result.scenarios.map((s) => (
                <tr key={s.tier} style={s.belowFloor ? { background: "#fee2e2" } : {}}>
                  <td>{s.tier}</td>
                  <td>{formatVND(s.discount)}</td>
                  <td className="price">{formatVND(s.finalPrice)}</td>
                  <td className={s.belowFloor ? "error-text" : ""}>
                    {formatVND(s.profit)}{s.belowFloor && " ⚠️ dưới giá sàn"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={apply}>
            Áp giá {formatVND(result.optimalPrice)} lên website
          </button>
        </div>
      )}
    </div>
  );
}
