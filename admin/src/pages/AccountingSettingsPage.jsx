import { useEffect, useState } from "react";
import api from "../lib/axios.js";

// CẤU HÌNH KẾ TOÁN (v10-P2): tham số định giá + tỷ lệ theo danh mục.
// Các tham số này nuôi: Ceff (chi phí lưu kho), máy tính định giá (P4),
// đánh giá lại tồn kho LCNRV (P4).
export default function AccountingSettingsPage() {
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/accounting/settings").then((r) => setForm(r.data));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCat = (i, k, v) =>
    setForm((f) => ({
      ...f,
      categoryConfigs: f.categoryConfigs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)),
    }));
  // Sửa 1 ô trong ma trận chiết khấu: tier = student/mem/vip, field = percent/cap
  const setDisc = (i, tier, field, v) =>
    setForm((f) => ({
      ...f,
      discountMatrix: f.discountMatrix.map((r, idx) =>
        idx === i ? { ...r, [tier]: { ...r[tier], [field]: v } } : r
      ),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(""); setError("");
    try {
      const body = {
        fixedCostMonthly: Number(form.fixedCostMonthly),
        packagingCost: Number(form.packagingCost),
        marketingRatePct: Number(form.marketingRatePct),
        gatewayFeePct: Number(form.gatewayFeePct),
        riskProvisionPct: Number(form.riskProvisionPct),
        netProfitPct: Number(form.netProfitPct),
        vipMemThreshold: Number(form.vipMemThreshold),
        vipVipThreshold: Number(form.vipVipThreshold),
        openingCostRatio: Number(form.openingCostRatio),
        categoryConfigs: form.categoryConfigs.map((c) => ({
          categorySlug: c.categorySlug,
          label: c.label,
          carryingRatePct: Number(c.carryingRatePct),
          depreciationPct: (Array.isArray(c.depreciationPct) ? c.depreciationPct : String(c.depreciationPct).split("/")).map(Number),
        })),
        discountMatrix: form.discountMatrix.map((r) => ({
          categorySlug: r.categorySlug,
          label: r.label,
          student: { percent: Number(r.student.percent), cap: Number(r.student.cap) },
          mem: { percent: Number(r.mem.percent), cap: Number(r.mem.cap) },
          vip: { percent: Number(r.vip.percent), cap: Number(r.vip.cap) },
        })),
      };
      await api.put("/accounting/settings", body);
      setMsg("Đã lưu cấu hình kế toán.");
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu cấu hình");
    }
  };

  if (!form) return <p className="info-text">Đang tải...</p>;

  return (
    <div>
      <h1>Cấu hình kế toán</h1>
      <form className="auth-form wide" onSubmit={handleSubmit}>
        {msg && <p className="success-text">{msg}</p>}
        {error && <p className="error-text">{error}</p>}

        <h2>Tham số định giá động</h2>
        <p className="meta">Công thức: P* = (C0 + FC/N + đóng gói) / (1 − %M − %Gt − %Rp − %Ln)</p>
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>Chi phí cố định/tháng FC (đ)
            <input type="number" value={form.fixedCostMonthly} onChange={(e) => set("fixedCostMonthly", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>Chi phí đóng gói/sp (đ)
            <input type="number" value={form.packagingCost} onChange={(e) => set("packagingCost", e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">%Marketing<input type="number" step="0.1" value={form.marketingRatePct} onChange={(e) => set("marketingRatePct", e.target.value)} /></label>
          <label className="field">%Cổng thanh toán<input type="number" step="0.1" value={form.gatewayFeePct} onChange={(e) => set("gatewayFeePct", e.target.value)} /></label>
          <label className="field">%Dự phòng rủi ro<input type="number" step="0.1" value={form.riskProvisionPct} onChange={(e) => set("riskProvisionPct", e.target.value)} /></label>
          <label className="field">%Lợi nhuận ròng<input type="number" step="0.1" value={form.netProfitPct} onChange={(e) => set("netProfitPct", e.target.value)} /></label>
        </div>

        <h2>Tỷ lệ theo danh mục</h2>
        <p className="meta">Lưu kho %/năm (tính chi phí hiệu dụng Ceff) · Sụt giá công nghệ 3 năm (cách nhau dấu /)</p>
        <table className="table">
          <thead><tr><th>Danh mục</th><th>Lưu kho %/năm</th><th>Sụt giá năm 1/2/3 (%)</th></tr></thead>
          <tbody>
            {form.categoryConfigs.map((c, i) => (
              <tr key={c.categorySlug}>
                <td>{c.label || c.categorySlug}</td>
                <td><input type="number" step="0.1" style={{ width: 90 }} value={c.carryingRatePct} onChange={(e) => setCat(i, "carryingRatePct", e.target.value)} /></td>
                <td><input style={{ width: 120 }} value={Array.isArray(c.depreciationPct) ? c.depreciationPct.join("/") : c.depreciationPct} onChange={(e) => setCat(i, "depreciationPct", e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Ma trận chiết khấu thành viên</h2>
        <p className="meta">% giảm + CAP (mức giảm tối đa, đồng) cho từng hạng. Khách được áp mức lợi nhất giữa HSSV và hạng VIP.</p>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Danh mục</th>
                <th>HSSV %/cap</th>
                <th>S-MEM %/cap</th>
                <th>S-VIP %/cap</th>
              </tr>
            </thead>
            <tbody>
              {form.discountMatrix?.map((r, i) => (
                <tr key={r.categorySlug}>
                  <td>{r.label || r.categorySlug}</td>
                  {["student", "mem", "vip"].map((tier) => (
                    <td key={tier}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input type="number" step="0.1" style={{ width: 54 }} value={r[tier].percent} onChange={(e) => setDisc(i, tier, "percent", e.target.value)} />
                        <input type="number" style={{ width: 90 }} value={r[tier].cap} onChange={(e) => setDisc(i, tier, "cap", e.target.value)} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Hạng VIP & giá vốn mở sổ</h2>
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>Ngưỡng S-MEM (đ tích lũy)
            <input type="number" value={form.vipMemThreshold} onChange={(e) => set("vipMemThreshold", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>Ngưỡng S-VIP (đ tích lũy)
            <input type="number" value={form.vipVipThreshold} onChange={(e) => set("vipVipThreshold", e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>Tỷ lệ giá vốn mở sổ (0-1)
            <input type="number" step="0.01" min="0" max="1" value={form.openingCostRatio} onChange={(e) => set("openingCostRatio", e.target.value)} />
          </label>
        </div>

        <button className="btn btn-primary">Lưu cấu hình</button>
      </form>
    </div>
  );
}
