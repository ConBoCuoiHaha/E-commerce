import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, MapPin } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { useCart } from "../context/CartContext.jsx";
import { formatVND } from "../components/ProductCard.jsx";
import { PROVINCES } from "../lib/provinces.js";

// Checkout v5: dropdown 63 tỉnh/thành, lỗi hiển thị THEO TỪNG Ô bằng
// tiếng Việt cụ thể (validate client trước, lỗi server map về đúng ô),
// đơn chuyển khoản -> chuyển sang trang hướng dẫn thanh toán.

// Quy tắc kiểm tra từng ô - trả về thông báo lỗi hoặc "" nếu hợp lệ
const validators = {
  fullName: (v) =>
    !v.trim() ? "Vui lòng nhập họ tên người nhận"
    : v.trim().length < 2 ? "Họ tên quá ngắn (ít nhất 2 ký tự)" : "",
  phone: (v) =>
    !v.trim() ? "Vui lòng nhập số điện thoại"
    : !/^0\d{9}$/.test(v.trim()) ? "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)" : "",
  address: (v) =>
    !v.trim() ? "Vui lòng nhập địa chỉ nhận hàng"
    : v.trim().length < 5 ? "Địa chỉ quá ngắn — vui lòng nhập số nhà, tên đường" : "",
  city: (v) => (!v ? "Vui lòng chọn Tỉnh/Thành phố" : ""),
};

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState(""); // lỗi chung (hết hàng...)
  const [fieldErrors, setFieldErrors] = useState({}); // lỗi theo từng ô
  const [form, setForm] = useState({
    fullName: "", phone: "", address: "", city: "", paymentMethod: "cod",
  });
  const [saveAddress, setSaveAddress] = useState(false);

  // Sổ địa chỉ đã lưu
  const [addresses, setAddresses] = useState([]);
  useEffect(() => {
    api.get("/addresses").then((r) => {
      setAddresses(r.data);
      const def = r.data.find((a) => a.isDefault);
      if (def) fillAddress(def);
    }).catch(() => {});
  }, []);

  const fillAddress = (a) => {
    setForm((f) => ({ ...f, fullName: a.fullName, phone: a.phone, address: a.address, city: a.city }));
    setFieldErrors({});
  };

  // Mã giảm giá
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState("");

  const applyCoupon = async () => {
    setCouponMsg("");
    setCoupon(null);
    if (!couponInput.trim()) return;
    try {
      const res = await api.post("/coupons/apply", {
        code: couponInput.trim().toUpperCase(),
        itemsPrice: totalPrice,
      });
      setCoupon(res.data);
      setCouponMsg(res.data.message);
    } catch (err) {
      setCouponMsg(err.response?.data?.message || "Mã không hợp lệ");
    }
  };

  // Nhập tới đâu kiểm tra tới đó (lỗi biến mất ngay khi sửa đúng)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (validators[name]) {
      setFieldErrors((errs) => ({ ...errs, [name]: validators[name](value) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTopError("");

    // 1. Validate TOÀN BỘ form trước khi gửi
    const errs = {};
    for (const [field, check] of Object.entries(validators)) {
      const msg = check(form[field]);
      if (msg) errs[field] = msg;
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return; // còn lỗi -> không gửi

    setSubmitting(true);
    try {
      if (saveAddress) {
        try {
          await api.post("/addresses", {
            fullName: form.fullName.trim(), phone: form.phone.trim(),
            address: form.address.trim(), city: form.city,
          });
        } catch { /* đầy sổ địa chỉ thì bỏ qua */ }
      }

      const res = await api.post("/orders", {
        orderItems: items.map((i) => ({
          product: i.productId,
          ...(i.variantId ? { variantId: i.variantId } : {}),
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: form.fullName.trim(), phone: form.phone.trim(),
          address: form.address.trim(), city: form.city,
        },
        paymentMethod: form.paymentMethod,
        ...(coupon ? { couponCode: coupon.code } : {}),
      });

      clearCart();
      // Chuyển khoản -> trang hướng dẫn thanh toán; COD -> đơn hàng của tôi
      if (form.paymentMethod === "banking") navigate(`/payment/${res.data._id}`);
      else navigate("/my-orders");
    } catch (err) {
      // 2. Lỗi server: map lỗi Zod về đúng ô (errors: [{field, message}])
      const serverErrors = err.response?.data?.errors;
      if (Array.isArray(serverErrors)) {
        const mapped = {};
        for (const se of serverErrors) {
          // field dạng "shippingAddress.phone" -> lấy phần cuối
          const key = se.field?.split(".").pop();
          if (key && validators[key]) mapped[key] = se.message;
        }
        setFieldErrors(mapped);
      }
      setTopError(err.response?.data?.message || "Đặt hàng thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return <p className="info-text">Giỏ hàng trống</p>;

  const estimatedDiscount = coupon?.discount || 0;

  // Ô nhập kèm lỗi bên dưới
  const Field = ({ name, children }) => (
    <div className="field-group">
      {children}
      {fieldErrors[name] && <span className="field-error">{fieldErrors[name]}</span>}
    </div>
  );

  return (
    <form className="auth-form wide" onSubmit={handleSubmit} noValidate>
      <h1>Đặt hàng</h1>
      {topError && <p className="error-text">{topError}</p>}

      {addresses.length > 0 && (
        <div className="addr-quick">
          <b style={{ fontSize: 13.5 }}><MapPin size={15} /> Địa chỉ đã lưu - bấm để điền nhanh:</b>
          {addresses.map((a) => (
            <button type="button" key={a._id} onClick={() => fillAddress(a)}>
              <b>{a.fullName}</b> · {a.phone} · {a.address}, {a.city}
              {a.isDefault && <span className="meta"> (mặc định)</span>}
            </button>
          ))}
        </div>
      )}

      <Field name="fullName">
        <input name="fullName" placeholder="Họ tên người nhận *" className={fieldErrors.fullName ? "invalid" : ""} value={form.fullName} onChange={handleChange} />
      </Field>
      <Field name="phone">
        <input name="phone" placeholder="Số điện thoại (10 số, bắt đầu bằng 0) *" className={fieldErrors.phone ? "invalid" : ""} value={form.phone} onChange={handleChange} />
      </Field>
      <Field name="address">
        <input name="address" placeholder="Địa chỉ: số nhà, tên đường, phường/xã *" className={fieldErrors.address ? "invalid" : ""} value={form.address} onChange={handleChange} />
      </Field>
      <Field name="city">
        <select name="city" className={fieldErrors.city ? "invalid" : ""} value={form.city} onChange={handleChange}>
          <option value="">-- Chọn Tỉnh/Thành phố * --</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      <label className="facet-option">
        <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
        Lưu địa chỉ này cho lần mua sau
      </label>

      <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
        <option value="cod">Thanh toán khi nhận hàng (COD)</option>
        <option value="banking">Chuyển khoản ngân hàng (có mã QR)</option>
      </select>

      <div className="coupon-row">
        <input placeholder="Mã giảm giá (nếu có)" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
        <button type="button" className="btn" onClick={applyCoupon}>
          <Ticket size={16} /> Áp dụng
        </button>
      </div>
      {couponMsg && (
        <p className={coupon ? "success-text" : "error-text"} style={{ margin: 0 }}>{couponMsg}</p>
      )}

      <div>
        <p>Tạm tính: <b>{formatVND(totalPrice)}</b></p>
        {estimatedDiscount > 0 && (
          <p className="success-text">Giảm giá ({coupon.code}): -{formatVND(estimatedDiscount)}</p>
        )}
        <p className="meta">+ phí ship 30.000₫ (miễn phí cho đơn từ 500.000₫) — server tính chính xác</p>
        <p className="price big">
          Ước tính: {formatVND(Math.max(0, totalPrice - estimatedDiscount) + (totalPrice >= 500000 ? 0 : 30000))}
        </p>
      </div>

      <button className="btn btn-primary" disabled={submitting}>
        {submitting ? "Đang đặt hàng..." : "Xác nhận đặt hàng"}
      </button>
    </form>
  );
}
