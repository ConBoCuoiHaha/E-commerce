import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle, Copy } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { formatVND } from "../components/ProductCard.jsx";

// TRANG HƯỚNG DẪN CHUYỂN KHOẢN (v5)
// Hiện: ngân hàng + số tài khoản + chủ TK + mã QR (admin cấu hình)
//       + SỐ TIỀN + MÃ THANH TOÁN của đơn (khách ghi vào nội dung CK).
// Trang TỰ HỎI server mỗi 8 giây (polling): khi hệ thống đối soát
// được tiền vào (đọc email ngân hàng) hoặc admin xác nhận tay,
// isPaid = true -> trang hiện "Thanh toán thành công" ngay lập tức.
export default function PaymentPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [setting, setSetting] = useState(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api.get("/settings").then((r) => setSetting(r.data)).catch(() => {});
  }, []);

  // Polling trạng thái đơn mỗi 8 giây cho tới khi đã thanh toán
  useEffect(() => {
    let timer;
    const load = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(res.data);
        if (!res.data.isPaid) timer = setTimeout(load, 8000);
      } catch {
        /* đơn không tồn tại/không phải của mình -> giữ trống */
      }
    };
    load();
    return () => clearTimeout(timer); // rời trang -> ngừng polling
  }, [orderId]);

  const copy = (text, label) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  if (!order || !setting) return <p className="info-text">Đang tải...</p>;

  const shortId = order._id.slice(-8).toUpperCase();

  // ============ ĐÃ THANH TOÁN ============
  if (order.isPaid) {
    return (
      <div className="payment-box" style={{ textAlign: "center" }}>
        <CheckCircle size={64} weight="fill" color="var(--green)" style={{ alignSelf: "center" }} />
        <p className="pay-success">Thanh toán thành công!</p>
        <p>
          HungSaiGon đã nhận được <b>{formatVND(order.totalPrice)}</b> cho đơn{" "}
          <b>#{shortId}</b>. Đơn hàng sẽ được giao đến:
        </p>
        <p className="meta">
          {order.shippingAddress.fullName} · {order.shippingAddress.phone}<br />
          {order.shippingAddress.address}, {order.shippingAddress.city}
        </p>
        <Link to="/my-orders" className="btn btn-primary">Xem đơn hàng của tôi</Link>
      </div>
    );
  }

  // ============ CHỜ THANH TOÁN ============
  return (
    <div className="payment-box">
      <h1 style={{ margin: 0 }}>Thanh toán đơn #{shortId}</h1>
      <p className="meta">
        Chuyển khoản đúng số tiền và ghi đúng MÃ THANH TOÁN vào nội dung.
        Hệ thống tự động xác nhận trong vài phút sau khi nhận tiền.
      </p>

      {setting.bankQrImage && <img className="qr" src={setting.bankQrImage} alt="Mã QR thanh toán" />}

      <div>
        <div className="pay-row"><span>Ngân hàng</span><b>{setting.bankName}</b></div>
        <div className="pay-row">
          <span>Số tài khoản</span>
          <b className="copyable" onClick={() => copy(setting.bankAccountNumber, "stk")} title="Bấm để copy">
            {setting.bankAccountNumber} <Copy size={14} /> {copied === "stk" && "✓"}
          </b>
        </div>
        <div className="pay-row"><span>Chủ tài khoản</span><b>{setting.bankAccountHolder}</b></div>
        <div className="pay-row">
          <span>Số tiền</span>
          <b className="copyable" onClick={() => copy(String(order.totalPrice), "tien")} title="Bấm để copy">
            {formatVND(order.totalPrice)} <Copy size={14} /> {copied === "tien" && "✓"}
          </b>
        </div>
      </div>

      <div>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Nội dung chuyển khoản (bấm để copy):</p>
        <div className="pay-code" onClick={() => copy(order.paymentCode, "code")} title="Bấm để copy">
          {order.paymentCode} {copied === "code" && " ✓"}
        </div>
      </div>

      <div className="pay-status">
        <span className="dot" /> Đang chờ thanh toán — trang tự cập nhật khi nhận được tiền
      </div>

      <p className="meta">
        Đã chuyển nhưng quên ghi mã? Đừng lo — liên hệ hotline {setting.hotline},
        nhân viên sẽ đối soát và xác nhận thủ công cho bạn.
      </p>
    </div>
  );
}
