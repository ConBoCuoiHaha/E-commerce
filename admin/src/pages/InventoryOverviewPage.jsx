import { useEffect, useState } from "react";
import { Warning, TrendDown } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

// TAB 1 - TỔNG QUAN TÀI CHÍNH KHO (v10-P2)
// KPI + biểu đồ tuổi kho + danh sách hàng chậm luân chuyển (>6 tháng,
// đánh dấu đỏ + đề xuất xả kho). Dữ liệu từ /inventory/overview.
const AGE_COLOR = { "0-3": "#15803d", "3-6": "#0065ee", "6-12": "#f59e0b", ">12": "#d92d20" };

export default function InventoryOverviewPage() {
  const [data, setData] = useState(null);

  const load = () => api.get("/inventory/overview").then((r) => setData(r.data));
  useEffect(() => { load(); }, []);

  // Tạo chương trình xả kho (markdown trực tiếp) cho 1 sản phẩm tồn lâu
  const clearance = async (s) => {
    const percent = prompt(`Giảm bao nhiêu % để xả kho "${s.name}"?`, "20");
    if (percent === null) return;
    try {
      const res = await api.post("/inventory/clearance", { productId: s.productId, percent: Number(percent) });
      alert(res.data.message);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi tạo xả kho");
    }
  };

  if (!data) return <p className="info-text">Đang tải dữ liệu kho...</p>;

  const maxAge = Math.max(...data.ageing.map((a) => a.value), 1);

  return (
    <div>
      <h1>Tổng quan tài chính kho</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="num">{formatVND(data.totalStockValue)}</div>
          <div className="lbl">Tổng giá trị kho (theo giá nhập gốc)</div>
        </div>
        <div className="stat-card">
          <div className="num">{formatVND(data.totalCarryingCost)}</div>
          <div className="lbl">Chi phí lưu kho tích lũy thực tế</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.turnover}</div>
          <div className="lbl">Vòng quay kho (giá vốn 12 tháng / tồn hiện tại)</div>
        </div>
      </div>

      {/* Biểu đồ tuổi kho */}
      <h2>Phân bổ theo tuổi kho</h2>
      <div className="bar-chart" style={{ height: 200 }}>
        {data.ageing.map((a) => (
          <div key={a.range} className="bar-col" title={`${a.range} tháng: ${a.qty} cái`}>
            <span className="bar-value">{a.value > 0 ? Math.round(a.value / 1e6) + "tr" : ""}</span>
            <div
              className="bar"
              style={{ height: `${Math.max(2, (a.value / maxAge) * 100)}%`, background: AGE_COLOR[a.range] }}
            />
            <span className="bar-label">{a.range} th</span>
          </div>
        ))}
      </div>

      {/* Hàng chậm luân chuyển */}
      <div className="section-head" style={{ marginTop: 22 }}>
        <h2 style={{ margin: 0 }}>
          <TrendDown size={18} style={{ verticalAlign: "-3px" }} /> Hàng chậm luân chuyển (&gt; 6 tháng)
        </h2>
        <span className="meta">{data.slowMoving.length} mục cần xả kho</span>
      </div>

      {data.slowMoving.length === 0 ? (
        <p className="info-text">Không có hàng tồn quá 6 tháng. Kho luân chuyển tốt!</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Sản phẩm</th><th>SKU</th><th>Tồn</th><th>Giá nhập</th><th>Tuổi kho</th><th>Chi phí lưu kho</th><th></th></tr>
          </thead>
          <tbody>
            {data.slowMoving.map((s) => (
              <tr key={s.batchId + s.sku} style={s.months >= 12 ? { background: "#fee2e2" } : {}}>
                <td>{s.name}</td>
                <td className="meta">{s.sku}</td>
                <td>{s.quantity}</td>
                <td>{formatVND(s.importPrice)}</td>
                <td>
                  <span className={`status-chip ${s.months >= 12 ? "s-cancelled" : "s-pending"}`}>
                    {s.months} tháng
                  </span>
                </td>
                <td className="error-text">{formatVND(s.carryingCost)}</td>
                <td>
                  <button
                    className="btn btn-sm"
                    title="Giảm giá trực tiếp để xả hàng tồn lâu"
                    onClick={() => clearance(s)}
                  >
                    <Warning size={13} /> Xả kho
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
