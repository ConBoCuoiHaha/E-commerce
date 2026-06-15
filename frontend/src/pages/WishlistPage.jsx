import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext.jsx";
import ProductCard from "../components/ProductCard.jsx";

export default function WishlistPage() {
  const { items } = useWishlist();

  return (
    <div>
      <h1>Sản phẩm yêu thích ({items.length})</h1>
      {items.length === 0 ? (
        <p className="info-text">
          Chưa có sản phẩm yêu thích nào.{" "}
          <Link to="/products" style={{ color: "var(--accent)" }}>Khám phá ngay →</Link>
        </p>
      ) : (
        <div className="product-grid">
          {items.map((p) => <ProductCard key={p._id} product={p} />)}
        </div>
      )}
    </div>
  );
}
