import { useEffect, useState } from "react";
import { Ticket, Copy } from "@phosphor-icons/react";
import api from "../../lib/axios.js";
import { formatVND } from "../../components/ProductCard.jsx";
import { usePageMeta } from "../../lib/usePageMeta.js";

// VOUCHER CỦA TÔI (v7): khách xem mã giảm giá đang khả dụng
// (đang bật + còn hạn + còn lượt), bấm để copy dùng lúc checkout.
export default function VouchersPage() {
  usePageMeta("Voucher của tôi");
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api.get("/coupons/available").then((r) => setVouchers(r.data)).finally(() => setLoading(false));
  }, []);

  const copy = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1500);
  };

  if (loading) return <p className="info-text">Đang tải...</p>;

  return (
    <div>
      <h1>Voucher của tôi ({vouchers.length})</h1>
      {vouchers.length === 0 && (
        <p className="info-text">Hiện chưa có voucher khả dụng. Quay lại sau nhé!</p>
      )}

      {vouchers.map((v) => (
        <div key={v.code} className="order-card">
          <div className="order-head">
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ticket size={20} color="var(--accent)" />
              <b style={{ fontSize: 16, letterSpacing: 1 }}>{v.code}</b>
              {v.almostOut && <span className="status-chip s-pending">Sắp hết lượt</span>}
            </span>
            <button className="btn btn-sm" onClick={() => copy(v.code)}>
              <Copy size={14} /> {copied === v.code ? "Đã copy!" : "Copy mã"}
            </button>
          </div>
          <p className="price">
            Giảm {v.discountType === "percent" ? `${v.discountValue}%` : formatVND(v.discountValue)}
            {v.maxDiscount > 0 && <span className="meta"> (tối đa {formatVND(v.maxDiscount)})</span>}
          </p>
          {v.description && <p className="meta">{v.description}</p>}
          <p className="meta">
            {v.minOrderValue > 0 && <>Đơn tối thiểu {formatVND(v.minOrderValue)} · </>}
            HSD: {new Date(v.expiresAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      ))}
    </div>
  );
}
