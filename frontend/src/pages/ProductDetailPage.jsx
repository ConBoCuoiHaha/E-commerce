import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, Scales, Star, CaretLeft, CaretRight, CaretDown } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useCompare } from "../context/CompareContext.jsx";
import { formatVND } from "../components/ProductCard.jsx";
import { usePageMeta } from "../lib/usePageMeta.js";

// Nhãn tiếng Việt cho bảng thông số
const SPEC_LABELS = {
  brand: "Hãng", cpu: "CPU", gpu: "Card đồ họa", ram: "RAM",
  storage: "Lưu trữ", screenSize: "Màn hình (inch)",
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { isWished, toggleWishlist } = useWishlist();
  const { inCompare, toggleCompare } = useCompare();

  const [product, setProduct] = useState(null);
  const [variantIdx, setVariantIdx] = useState(0); // biến thể đang chọn

  // SEO: tiêu đề tab + meta theo tên sản phẩm (Google bot đọc được)
  usePageMeta(
    product?.name,
    product ? `${product.name} chính hãng, giá từ ${formatVND(product.price)} tại HungSaiGon.` : undefined
  );
  const [imgIdx, setImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // v9: mục "Cấu hình & đặc điểm" - mặc định hiện 6 dòng đầu, bấm mở rộng
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  // Review tách endpoint riêng (phân trang) - v4
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);

  const loadProduct = () => {
    api.get(`/products/${slug}`).then((res) => {
      setProduct(res.data);
      setVariantIdx(0);
      setImgIdx(0);
      loadReviews(res.data._id, 1);
    });
  };
  useEffect(loadProduct, [slug]);

  // Tải 1 trang review; page > 1 thì NỐI THÊM vào danh sách ("Xem thêm")
  const loadReviews = (productId, page) => {
    api.get(`/products/${productId}/reviews`, { params: { page, limit: 5 } }).then((res) => {
      setReviews((prev) => (page === 1 ? res.data.reviews : [...prev, ...res.data.reviews]));
      setReviewPage(page);
      setReviewTotalPages(res.data.totalPages);
    });
  };

  if (!product) return <p className="info-text">Đang tải...</p>;

  const variant = product.variants?.[variantIdx] || null;
  const displayPrice = variant?.price ?? product.price;
  const stock = variant?.countInStock ?? product.countInStock;
  const gallery = [product.image, ...(product.images || [])];

  const handleAddToCart = () => {
    addToCart(product, variant, quantity);
    setMessage("✅ Đã thêm vào giỏ hàng!");
    setTimeout(() => setMessage(""), 2000);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${product._id}/reviews`, {
        rating: Number(rating),
        comment,
      });
      setComment("");
      loadProduct();
    } catch (err) {
      setMessage(err.response?.data?.message || "Lỗi gửi đánh giá");
    }
  };

  return (
    <div>
      <div className="detail-grid">
        {/* Gallery ảnh: mũi tên trái/phải chuyển ảnh (v9) + thumbnail */}
        <div>
          <div className="gallery-main">
            <img className="main" src={gallery[imgIdx]} alt={product.name} />
            {gallery.length > 1 && (
              <>
                <button
                  className="hero-nav prev" type="button" aria-label="Ảnh trước"
                  onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <button
                  className="hero-nav next" type="button" aria-label="Ảnh sau"
                  onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                >
                  <CaretRight size={18} weight="bold" />
                </button>
                <span className="gallery-count">{imgIdx + 1}/{gallery.length}</span>
              </>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="thumbs">
              {gallery.map((src, i) => (
                <img key={i} src={src} alt="" className={i === imgIdx ? "sel" : ""} onClick={() => setImgIdx(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div>
          <h1>{product.name}</h1>
          <p className="meta">
            {product.category?.name} · <Star size={14} weight="fill" color="#f59e0b" />{" "}
            {product.rating.toFixed(1)} ({product.numReviews} đánh giá)
          </p>
          <div className="price-row">
            <span className="price big">{formatVND(displayPrice)}</span>
            {product.originalPrice > displayPrice && (
              <span className="price-original">{formatVND(product.originalPrice)}</span>
            )}
          </div>

          {/* Chọn biến thể */}
          {product.variants?.length > 0 && (
            <div className="variant-list">
              <b>Chọn phiên bản:</b>
              {product.variants.map((v, i) => (
                <button
                  key={v._id}
                  className={`variant-opt ${i === variantIdx ? "sel" : ""}`}
                  onClick={() => setVariantIdx(i)}
                >
                  <span>{v.name}</span>
                  <span className="vprice">
                    {formatVND(v.price)} {v.countInStock === 0 && " (hết hàng)"}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="meta">Tồn kho phiên bản này: {stock}</p>

          {stock > 0 ? (
            <div className="add-cart-row">
              <input type="number" min="1" max={stock} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              <button className="btn btn-primary" onClick={handleAddToCart}>
                <ShoppingCart size={17} /> Thêm vào giỏ
              </button>
              <button
                className={`btn ${isWished(product._id) ? "active" : ""}`}
                onClick={() => (user ? toggleWishlist(product) : navigate("/login"))}
              >
                <Heart size={17} weight={isWished(product._id) ? "fill" : "regular"} />
                {isWished(product._id) ? "Đã thích" : "Yêu thích"}
              </button>
              <button
                className={`btn ${inCompare(product._id) ? "active" : ""}`}
                onClick={() => { const e2 = toggleCompare(product._id); if (e2) alert(e2); }}
              >
                <Scales size={17} /> So sánh
              </button>
            </div>
          ) : (
            <p className="error-text">Phiên bản này tạm hết hàng</p>
          )}
          {message && <p className="success-text">{message}</p>}

          {/* Tóm tắt nhanh từ attributes (bảng đầy đủ ở mục
              "Cấu hình & đặc điểm" phía dưới - v9) */}
          <table className="specs">
            <tbody>
              {Object.entries(SPEC_LABELS).map(([key, label]) =>
                product.attributes?.[key] ? (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{product.attributes[key]}</td>
                  </tr>
                ) : null
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CẤU HÌNH & ĐẶC ĐIỂM (v9) - bảng thông số ĐẦY ĐỦ ===== */}
      {product.specifications?.length > 0 && (
        <section className="spec-section">
          <h2>Cấu hình & đặc điểm</h2>
          <table className="specs">
            <tbody>
              {(showAllSpecs
                ? product.specifications
                : product.specifications.slice(0, 6)
              ).map((s) => (
                <tr key={s._id || s.label}>
                  <td>{s.label}</td>
                  <td>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {product.specifications.length > 6 && !showAllSpecs && (
            <button className="btn spec-expand" onClick={() => setShowAllSpecs(true)}>
              <CaretDown size={16} /> Xem đầy đủ {product.specifications.length} thông số
            </button>
          )}

          <h2 style={{ marginTop: 18 }}>Mô tả sản phẩm</h2>
          <p style={{ color: "#3f3f46" }}>{product.description}</p>
        </section>
      )}

      {/* Đánh giá (phân trang - bấm "Xem thêm" để tải trang kế) */}
      <section className="reviews">
        <h2>Đánh giá ({product.numReviews})</h2>
        {reviews.length === 0 && <p className="info-text">Chưa có đánh giá nào</p>}
        {reviews.map((r) => (
          <div key={r._id} className="review">
            <b>{r.name}</b>{" "}
            <span className="stars">
              {Array.from({ length: r.rating }, (_, i) => <Star key={i} size={13} weight="fill" />)}
            </span>
            <span className="meta"> · {new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
            <p>{r.comment}</p>
          </div>
        ))}
        {reviewPage < reviewTotalPages && (
          <button className="btn btn-sm" onClick={() => loadReviews(product._id, reviewPage + 1)}>
            Xem thêm đánh giá
          </button>
        )}

        {user ? (
          <form onSubmit={handleReview} className="review-form">
            <h3>Viết đánh giá</h3>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
            </select>
            <textarea required minLength={3} placeholder="Cảm nhận của bạn..." value={comment} onChange={(e) => setComment(e.target.value)} />
            <button className="btn btn-primary">Gửi đánh giá</button>
          </form>
        ) : (
          <p className="info-text">Đăng nhập để viết đánh giá</p>
        )}
      </section>
    </div>
  );
}
