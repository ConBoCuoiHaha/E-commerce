import { useEffect, useState } from "react";
import { Scales } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

// TAB 5 - KIỂM TOÁN: ĐÁNH GIÁ LẠI TỒN KHO LCNRV (v10-P4)
// So Giá gốc hiệu dụng (Ceff) với Giá trị thuần (NRV). Ceff > NRV ->
// đề xuất trích lập dự phòng giảm giá hàng tồn kho.
export default function LcnrvPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/inventory/lcnrv").then((r) => setData(r.data));
  }, []);

  if (!data) return <p className="info-text">Đang tính toán đánh giá lại tồn kho...</p>;

  return (
    <div>
      <h1><Scales size={22} style={{ verticalAlign: "-4px" }} /> Đánh giá lại tồn kho (LCNRV)</h1>
      <p className="meta">{data.note}</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="num" style={{ color: data.totalProvision > 0 ? "var(--price)" : "var(--green)" }}>
            {formatVND(data.totalProvision)}
          </div>
          <div className="lbl">Tổng dự phòng giảm giá cần trích lập</div>
        </div>
        <div className="stat-card">
          <div className="num">{data.rows.length}</div>
          <div className="lbl">SKU có giá gốc hiệu dụng vượt giá trị thuần</div>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <p className="info-text">
          Không có mặt hàng nào cần trích lập dự phòng — giá trị thuần (NRV) của mọi SKU vẫn
          cao hơn giá gốc hiệu dụng (Ceff). Tồn kho đang lành mạnh.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Sản phẩm</th><th>SKU</th><th>Tồn</th><th>Tuổi</th><th>Giá gốc HĐ (Ceff)</th><th>Giá trị thuần (NRV)</th><th>Dự phòng/đv</th><th>Tổng dự phòng</th></tr>
          </thead>
          <tbody>
            {/* 1 SKU có thể xuất hiện NHIỀU dòng (mỗi lô nhập tuổi khác nhau
                -> Ceff/dự phòng khác nhau) nên key phải kèm chỉ số dòng để
                DUY NHẤT, tránh cảnh báo "two children with the same key". */}
            {data.rows.map((r, i) => (
              <tr key={`${r.sku}-${i}`}>
                <td>{r.name}</td>
                <td className="meta">{r.sku}</td>
                <td>{r.quantity}</td>
                <td><span className="status-chip s-pending">{r.months} th</span></td>
                <td>{formatVND(r.ceffUnit)}</td>
                <td>{formatVND(r.nrvUnit)}</td>
                <td className="error-text">{formatVND(r.provisionUnit)}</td>
                <td className="error-text"><b>{formatVND(r.provision)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
