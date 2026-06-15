import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/orders/stats/summary").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p className="info-text">Đang tải thống kê...</p>;

  return (
    <div>
      <h1>Bảng điều khiển</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="num">{formatVND(stats.revenue)}</div>
          <div className="lbl">Doanh thu (đơn không hủy)</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.totalOrders}</div>
          <div className="lbl">Đơn hàng</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.totalUsers}</div>
          <div className="lbl">Khách hàng</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.totalProducts}</div>
          <div className="lbl">Sản phẩm đang bán</div>
        </div>
      </div>

      <h2>Đơn theo trạng thái</h2>
      <div className="stats-grid">
        {Object.entries(stats.ordersByStatus).map(([status, count]) => (
          <div key={status} className="stat-card">
            <div className="num">{count}</div>
            <div className="lbl">{status}</div>
          </div>
        ))}
      </div>

      <div className="form-row" style={{ marginTop: 18 }}>
        <Link to="/products" className="btn btn-primary">Quản lý sản phẩm</Link>
        <Link to="/orders" className="btn btn-primary">Quản lý đơn hàng</Link>
      </div>
    </div>
  );
}
