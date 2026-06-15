import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatVND } from "../components/ProductCard.jsx";

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export default function MyOrdersPage() {
  // Lấy trạng thái đăng nhập: trang "Đơn của tôi" gọi API CẦN xác thực
  // (/orders/my). Nếu CHƯA đăng nhập mà vẫn gọi -> backend trả 401 đỏ
  // trong console. Vì vậy chỉ gọi khi đã có user; chưa đăng nhập thì
  // hiện lời nhắc đăng nhập thay vì bắn request thất bại.
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/orders/my").then((res) => setOrders(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    // Đợi AuthContext xác định xong phiên. Có user -> tải đơn; không thì
    // dừng loading để hiện lời nhắc đăng nhập (không gọi API -> hết 401).
    if (authLoading) return;
    if (user) load();
    else setLoading(false);
  }, [authLoading, user]);

  const handleCancel = async (id) => {
    if (!confirm("Bạn chắc chắn muốn hủy đơn này?")) return;
    try {
      await api.put(`/orders/${id}/cancel`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Không hủy được đơn");
    }
  };

  if (authLoading || loading) return <p className="info-text">Đang tải...</p>;
  // Chưa đăng nhập -> nhắc đăng nhập, KHÔNG gọi API (tránh 401)
  if (!user)
    return (
      <p className="info-text">
        Vui lòng <Link to="/login">đăng nhập</Link> để xem đơn hàng của bạn.
      </p>
    );
  if (orders.length === 0) return <p className="info-text">Bạn chưa có đơn hàng nào</p>;

  return (
    <div>
      <h1>Đơn hàng của tôi</h1>
      {orders.map((o) => (
        <div key={o._id} className="order-card">
          <div className="order-head">
            <span className="meta">
              Mã đơn: <b>{o._id.slice(-8).toUpperCase()}</b> · {new Date(o.createdAt).toLocaleString("vi-VN")}
            </span>
            <span>
              <span className={`status-chip ${o.isPaid ? "s-delivered" : "s-pending"}`} style={{ marginRight: 6 }}>
                {o.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
              </span>
              <span className={`status-chip s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
            </span>
          </div>
          <ul>
            {o.orderItems.map((item, i) => (
              <li key={i}>
                {item.name}
                {item.variantName && <span className="meta"> ({item.variantName})</span>}
                {" "}× {item.quantity} — {formatVND(item.price * item.quantity)}
              </li>
            ))}
          </ul>
          <p className="meta">
            Giao tới: {o.shippingAddress.fullName}, {o.shippingAddress.phone}, {o.shippingAddress.address}, {o.shippingAddress.city}
          </p>
          <p className="price">Tổng: {formatVND(o.totalPrice)} (ship {formatVND(o.shippingPrice)})</p>
          <div className="form-row">
            {/* Đơn chuyển khoản chưa trả tiền -> dẫn lại trang thanh toán */}
            {o.paymentMethod === "banking" && !o.isPaid && o.status !== "cancelled" && (
              <Link to={`/payment/${o._id}`} className="btn btn-sm btn-primary">Thanh toán ngay</Link>
            )}
            {o.status === "pending" && (
              <button className="btn btn-sm" onClick={() => handleCancel(o._id)}>Hủy đơn</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
