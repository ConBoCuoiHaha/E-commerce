import { useEffect, useState } from "react";
import { Phone, MapPin, CreditCard, FilePdf } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../lib/format.js";

// Quản lý đơn hàng (v5): hiển thị ĐẦY ĐỦ thông tin giao hàng
// (người nhận, SĐT bấm gọi được, địa chỉ, tỉnh/thành) + trạng thái
// thanh toán + nút "Xác nhận đã nhận tiền" cho đơn chuyển khoản
// (đường dự phòng khi đối soát email tự động không bắt được).

const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUS_VI = {
  pending: "Xác nhận đơn", confirmed: "Giao hàng", shipping: "Đã giao",
  delivered: "Đã giao", cancelled: "Hủy đơn",
};
// Nhãn nút chuyển trạng thái: pending->confirmed = "Xác nhận đơn"...
const NEXT_LABEL = { confirmed: "Xác nhận đơn", shipping: "Giao hàng", delivered: "Đã giao", cancelled: "Hủy đơn" };

// Thanh lọc nhanh trên đầu (v7): các trạng thái admin PHẢI xử lý
const TABS = [
  { key: "", label: "Tất cả" },
  { key: "pending", label: "Chờ xác nhận" },
  { key: "unpaid", label: "Chờ thanh toán CK" },
  { key: "confirmed", label: "Chờ giao hàng" },
  { key: "shipping", label: "Đang giao" },
  { key: "delivered", label: "Đã giao" },
  { key: "cancelled", label: "Đã hủy" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(""); // trạng thái đang lọc
  const [counts, setCounts] = useState({}); // số lượng từng trạng thái

  const load = (status = tab) => {
    setLoading(true);
    // Lấy song song: danh sách theo bộ lọc + số liệu đếm cho các tab
    Promise.all([
      api.get("/orders", { params: status ? { status } : {} }),
      api.get("/orders/stats/summary"),
    ])
      .then(([ordersRes, statsRes]) => {
        setOrders(ordersRes.data.orders);
        setCounts({
          ...statsRes.data.ordersByStatus,
          unpaid: statsRes.data.unpaidBanking || 0,
        });
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => load(tab), [tab]);

  const updateStatus = async (id, status) => {
    if (status === "cancelled" && !confirm("Hủy đơn này? Tồn kho sẽ được hoàn lại.")) return;
    try {
      await api.put(`/orders/${id}/status`, { status });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi cập nhật trạng thái");
    }
  };

  const confirmPayment = async (id) => {
    if (!confirm("Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN cho đơn này? Khách sẽ nhận email thông báo.")) return;
    try {
      await api.put(`/orders/${id}/confirm-payment`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi xác nhận thanh toán");
    }
  };

  // Gửi hóa đơn PDF qua email cho khách (v9)
  const [sendingInvoice, setSendingInvoice] = useState(null);
  const sendInvoice = async (o) => {
    const note = o.invoiceSentAt
      ? `Đơn này ĐÃ GỬI hóa đơn lúc ${new Date(o.invoiceSentAt).toLocaleString("vi-VN")}. Gửi lại?`
      : `Gửi hóa đơn PDF tới ${o.user?.email}?`;
    if (!confirm(note)) return;
    setSendingInvoice(o._id);
    try {
      const res = await api.post(`/orders/${o._id}/invoice`);
      alert(res.data.message);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Gửi hóa đơn thất bại");
    } finally {
      setSendingInvoice(null);
    }
  };

  return (
    <div>
      <h1>Quản lý đơn hàng</h1>

      {/* Thanh quản lý nhanh: bấm tab để lọc, hiện số lượng cần xử lý */}
      <div className="toolbar" style={{ flexWrap: "wrap", justifyContent: "flex-start", gap: 6 }}>
        {TABS.map((t) => {
          const count = t.key === "" ? null : counts[t.key] || 0;
          return (
            <button
              key={t.key}
              className={`btn btn-sm ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {count > 0 && <span className="noti-badge" style={{ marginLeft: 6 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {loading && <p className="info-text">Đang tải...</p>}
      {!loading && orders.length === 0 && <p className="info-text">Không có đơn nào ở trạng thái này</p>}
      {orders.map((o) => (
        <div key={o._id} className="order-card">
          <div className="order-head">
            <span className="meta">
              Mã đơn <b>#{o._id.slice(-8).toUpperCase()}</b> · {new Date(o.createdAt).toLocaleString("vi-VN")} ·
              khách: <b>{o.user?.name}</b> ({o.user?.email})
            </span>
            <span>
              <span className={`status-chip ${o.isPaid ? "s-delivered" : "s-pending"}`} style={{ marginRight: 6 }}>
                {o.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
              </span>
              <span className={`status-chip s-${o.status}`}>{o.status}</span>
            </span>
          </div>

          {/* THÔNG TIN GIAO HÀNG - thứ shipper cần */}
          <p style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 12px" }}>
            <MapPin size={15} style={{ verticalAlign: "-2px" }} />{" "}
            <b>{o.shippingAddress.fullName}</b> ·{" "}
            <a href={`tel:${o.shippingAddress.phone}`} className="link">
              <Phone size={14} style={{ verticalAlign: "-2px" }} /> {o.shippingAddress.phone}
            </a>
            <br />
            {o.shippingAddress.address}, {o.shippingAddress.city}
          </p>

          <ul>
            {o.orderItems.map((item, i) => (
              <li key={i}>
                {item.name}
                {item.variantName && <span className="meta"> ({item.variantName})</span>} × {item.quantity}
                {" — "}{formatVND(item.price * item.quantity)}
              </li>
            ))}
          </ul>

          <p className="meta">
            Tiền hàng {formatVND(o.itemsPrice)} · Ship {formatVND(o.shippingPrice)}
            {o.discountPrice > 0 && <> · Giảm ({o.couponCode}) -{formatVND(o.discountPrice)}</>}
          </p>
          <p className="price">
            <CreditCard size={15} style={{ verticalAlign: "-2px" }} />{" "}
            Tổng: {formatVND(o.totalPrice)} · {o.paymentMethod === "cod" ? "COD" : "Chuyển khoản"}
            {o.paymentCode && <span className="meta"> · mã CK: <b>{o.paymentCode}</b></span>}
          </p>

          <div className="form-row">
            {/* Xác nhận thanh toán tay - chỉ đơn banking chưa trả tiền, chưa hủy */}
            {o.paymentMethod === "banking" && !o.isPaid && o.status !== "cancelled" && (
              <button className="btn btn-sm btn-primary" onClick={() => confirmPayment(o._id)}>
                Xác nhận đã nhận tiền
              </button>
            )}
            {NEXT_STATUS[o.status].map((s) => (
              <button key={s} className="btn btn-sm" onClick={() => updateStatus(o._id, s)}>
                → {NEXT_LABEL[s]}
              </button>
            ))}
            {o.status !== "cancelled" && (
              <button
                className="btn btn-sm"
                onClick={() => sendInvoice(o)}
                disabled={sendingInvoice === o._id}
              >
                <FilePdf size={14} />{" "}
                {sendingInvoice === o._id
                  ? "Đang gửi..."
                  : o.invoiceSentAt ? "Gửi lại hóa đơn" : "Gửi hóa đơn"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
