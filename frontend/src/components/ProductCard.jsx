import { Link, useNavigate } from "react-router-dom";
import { Heart, Scales, Star } from "@phosphor-icons/react";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useCompare } from "../context/CompareContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";

export default function ProductCard({ product }) {
  const { isWished, toggleWishlist } = useWishlist();
  const { inCompare, toggleCompare } = useCompare();
  const { user } = useAuth();
  const navigate = useNavigate();

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;

  // Chip thông số ngắn gọn trên card (kiểu thinkpro): CPU / RAM / màn hình
  const chips = [
    product.attributes?.cpu,
    product.attributes?.ram && `RAM ${product.attributes.ram}`,
    product.attributes?.screenSize && `${product.attributes.screenSize}"`,
    product.attributes?.storage,
  ].filter(Boolean).slice(0, 3);

  const handleWish = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    await toggleWishlist(product);
  };

  const handleCompare = (e) => {
    e.preventDefault();
    const err = toggleCompare(product._id);
    if (err) alert(err);
  };

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      {discount > 0 && <span className="discount-badge">-{discount}%</span>}
      <img src={product.image} alt={product.name} loading="lazy" />
      <div className="pc-body">
        <h3>{product.name}</h3>
        {chips.length > 0 && (
          <div className="spec-chips">
            {chips.map((c) => <span key={c} className="chip">{c}</span>)}
          </div>
        )}
        <div className="price-row">
          <span className="price">
            {product.variants?.length > 1 ? "Từ " : ""}{formatVND(product.price)}
          </span>
          {discount > 0 && (
            <span className="price-original">{formatVND(product.originalPrice)}</span>
          )}
        </div>
        <p className="meta">
          <Star size={13} weight="fill" color="#f59e0b" />
          {product.rating?.toFixed(1)} ({product.numReviews}) ·{" "}
          {product.countInStock > 0 ? "Còn hàng" : "Hết hàng"}
        </p>
        <div className="pc-actions">
          <button
            className={`icon-btn ${isWished(product._id) ? "active" : ""}`}
            onClick={handleWish}
            title="Yêu thích"
          >
            <Heart size={15} weight={isWished(product._id) ? "fill" : "regular"} />
          </button>
          <button
            className={`icon-btn ${inCompare(product._id) ? "active" : ""}`}
            onClick={handleCompare}
            title="So sánh"
          >
            <Scales size={15} />
          </button>
        </div>
      </div>
    </Link>
  );
}
