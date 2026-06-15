import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/axios.js";
import { useCompare } from "../context/CompareContext.jsx";
import { formatVND } from "../components/ProductCard.jsx";

// Các dòng thông số hiển thị trong bảng so sánh
const ROWS = [
  { key: "brand", label: "Hãng" },
  { key: "cpu", label: "CPU" },
  { key: "gpu", label: "Card đồ họa" },
  { key: "ram", label: "RAM" },
  { key: "storage", label: "Lưu trữ" },
  { key: "screenSize", label: "Màn hình (inch)" },
];

export default function ComparePage() {
  const { ids, toggleCompare, clearCompare } = useCompare();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    api
      .get(`/products/compare/list?ids=${ids.join(",")}`)
      .then((res) => setProducts(res.data));
  }, [ids]);

  if (ids.length === 0) {
    return (
      <p className="info-text">
        Chưa chọn sản phẩm nào để so sánh. Bấm nút ⚖️ trên thẻ sản phẩm để thêm (tối đa 3).{" "}
        <Link to="/products" style={{ color: "var(--accent)" }}>Xem sản phẩm →</Link>
      </p>
    );
  }

  return (
    <div>
      <div className="toolbar">
        <h1 style={{ margin: 0 }}>So sánh sản phẩm</h1>
        <button className="btn btn-sm" onClick={clearCompare}>Xóa tất cả</button>
      </div>

      <div className="compare-table">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              {products.map((p) => (
                <th key={p._id}>
                  <img src={p.image} alt={p.name} />
                  <div><Link to={`/product/${p.slug}`} style={{ color: "var(--accent)" }}>{p.name}</Link></div>
                  <button className="btn btn-sm" onClick={() => toggleCompare(p._id)}>Bỏ</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Giá</b></td>
              {products.map((p) => (
                <td key={p._id} className="price">
                  {p.variants?.length > 1 ? "Từ " : ""}{formatVND(p.price)}
                </td>
              ))}
            </tr>
            <tr>
              <td><b>Đánh giá</b></td>
              {products.map((p) => (
                <td key={p._id}>{p.rating?.toFixed(1)} / 5 ({p.numReviews})</td>
              ))}
            </tr>
            {ROWS.map((row) => (
              <tr key={row.key}>
                <td><b>{row.label}</b></td>
                {products.map((p) => (
                  <td key={p._id}>{p.attributes?.[row.key] ?? "—"}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td><b>Phiên bản</b></td>
              {products.map((p) => (
                <td key={p._id}>
                  {p.variants?.map((v) => (
                    <div key={v._id} className="meta">{v.name}: {formatVND(v.price)}</div>
                  ))}
                </td>
              ))}
            </tr>
            <tr>
              <td><b>Tồn kho</b></td>
              {products.map((p) => (
                <td key={p._id}>{p.countInStock > 0 ? `Còn ${p.countInStock}` : "Hết hàng"}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
