import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { formatVND } from "../components/ProductCard.jsx";

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <p className="info-text">
        Giỏ hàng trống. <Link to="/products" style={{ color: "var(--accent)" }}>Mua sắm ngay →</Link>
      </p>
    );
  }

  return (
    <div>
      <h1>Giỏ hàng</h1>
      <table className="table">
        <thead>
          <tr><th>Sản phẩm</th><th>Giá</th><th>SL</th><th>Tổng</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td className="cart-item-name">
                <img src={item.image} alt="" width="52" />
                <div>
                  {item.name}
                  {item.variantName && <div className="meta">{item.variantName}</div>}
                </div>
              </td>
              <td>{formatVND(item.price)}</td>
              <td>
                <input
                  type="number" min="1" max={item.maxStock} style={{ width: 64 }}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.key, Number(e.target.value))}
                />
              </td>
              <td>{formatVND(item.price * item.quantity)}</td>
              <td><button className="btn btn-sm" onClick={() => removeFromCart(item.key)}>Xóa</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cart-summary">
        <p className="price big">Tạm tính: {formatVND(totalPrice)}</p>
        <p className="meta">Phí ship 30.000₫ — miễn phí cho đơn từ 500.000₫ (server tính chính xác khi đặt)</p>
        <Link to="/checkout" className="btn btn-primary">Tiến hành đặt hàng →</Link>
      </div>
    </div>
  );
}
