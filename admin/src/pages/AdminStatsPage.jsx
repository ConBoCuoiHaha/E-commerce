import { useEffect, useState } from "react";
import { FileXls } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

// THỐNG KÊ NÂNG CAO (v8): đơn hàng + doanh thu theo tháng/năm,
// thống kê phản hồi, xuất Excel có trang trí màu.
// Biểu đồ cột vẽ bằng CSS thuần (chiều cao cột theo % giá trị lớn nhất)
// - không cần thư viện chart, đủ trực quan cho dashboard nội bộ.
export default function AdminStatsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setStats(null);
    api.get("/orders/stats/advanced", { params: { year } }).then((r) => setStats(r.data));
  }, [year]);

  // Tải file Excel: axios nhận BLOB (dữ liệu nhị phân) rồi tạo link
  // tải ảo - cách chuẩn để download file từ API cần cookie đăng nhập.
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/orders/stats/export", {
        params: { year },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hungsaigon-thong-ke-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url); // dọn bộ nhớ sau khi tải
    } catch {
      alert("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  if (!stats) return <p className="info-text">Đang tải thống kê...</p>;

  const maxRevenue = Math.max(...stats.monthly.map((m) => m.revenue), 1);
  const sumOrders = stats.monthly.reduce((s, m) => s + m.orders, 0);
  const sumRevenue = stats.monthly.reduce((s, m) => s + m.revenue, 0);

  // Các năm cho dropdown: lấy từ dữ liệu thật + năm hiện tại
  const yearOptions = [...new Set([...stats.yearly.map((y) => y.year), currentYear])].sort();

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>Thống kê nâng cao</h1>
        <div className="form-row">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions.map((y) => <option key={y} value={y}>Năm {y}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            <FileXls size={17} /> {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
        </div>
      </div>

      {/* Thẻ tổng quan năm đang chọn */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="num">{formatVND(sumRevenue)}</div>
          <div className="lbl">Doanh thu năm {year}</div>
        </div>
        <div className="stat-card">
          <div className="num">{sumOrders}</div>
          <div className="lbl">Đơn hàng năm {year}</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.feedback.unresolved}</div>
          <div className="lbl">Phản hồi chờ xử lý (tổng {stats.feedback.total}, đã xử lý {stats.feedback.resolved})</div>
        </div>
      </div>

      {/* Biểu đồ cột doanh thu 12 tháng (CSS thuần) */}
      <h2>Doanh thu theo tháng - {year}</h2>
      <div className="bar-chart">
        {stats.monthly.map((m) => (
          <div key={m.month} className="bar-col" title={`Tháng ${m.month}: ${formatVND(m.revenue)} (${m.orders} đơn)`}>
            <span className="bar-value">{m.revenue > 0 ? Math.round(m.revenue / 1e6) + "tr" : ""}</span>
            <div className="bar" style={{ height: `${Math.max(2, (m.revenue / maxRevenue) * 100)}%` }} />
            <span className="bar-label">T{m.month}</span>
          </div>
        ))}
      </div>

      {/* Bảng chi tiết theo tháng */}
      <h2 style={{ marginTop: 22 }}>Chi tiết theo tháng</h2>
      <table className="table">
        <thead>
          <tr><th>Tháng</th><th>Số đơn</th><th>Doanh thu</th><th>Đã giao</th><th>Đã hủy</th><th>Phản hồi</th></tr>
        </thead>
        <tbody>
          {stats.monthly.map((m) => (
            <tr key={m.month}>
              <td>Tháng {m.month}</td>
              <td>{m.orders}</td>
              <td className={m.revenue > 0 ? "price" : "meta"}>{formatVND(m.revenue)}</td>
              <td>{m.delivered}</td>
              <td className={m.cancelled > 0 ? "error-text" : ""}>{m.cancelled}</td>
              <td>{m.feedback}</td>
            </tr>
          ))}
          <tr style={{ background: "#d1fae5", fontWeight: 700 }}>
            <td>TỔNG</td>
            <td>{sumOrders}</td>
            <td className="price">{formatVND(sumRevenue)}</td>
            <td>{stats.monthly.reduce((s, m) => s + m.delivered, 0)}</td>
            <td>{stats.monthly.reduce((s, m) => s + m.cancelled, 0)}</td>
            <td>{stats.monthly.reduce((s, m) => s + m.feedback, 0)}</td>
          </tr>
        </tbody>
      </table>

      {/* So sánh các năm */}
      <h2 style={{ marginTop: 22 }}>So sánh các năm</h2>
      <table className="table">
        <thead><tr><th>Năm</th><th>Số đơn</th><th>Doanh thu</th></tr></thead>
        <tbody>
          {stats.yearly.map((y) => (
            <tr key={y.year}>
              <td><b>{y.year}</b></td>
              <td>{y.orders}</td>
              <td className="price">{formatVND(y.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
