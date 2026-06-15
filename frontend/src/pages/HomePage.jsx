import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SealCheck, Truck, CreditCard, Headset } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import ProductCard from "../components/ProductCard.jsx";
import CategorySidebar from "../components/CategorySidebar.jsx";
import HeroBanner from "../components/HeroBanner.jsx";
import { usePageMeta } from "../lib/usePageMeta.js";

export default function HomePage() {
  usePageMeta(
    "", // trang chủ dùng tiêu đề mặc định đầy đủ
    "HungSaiGon - cửa hàng laptop, bàn phím, chuột, màn hình, RAM, SSD chính hãng. Bảo hành 12 tháng."
  );
  const [featured, setFeatured] = useState([]);
  const [newest, setNewest] = useState([]);

  useEffect(() => {
    api.get("/products/featured/list").then((r) => setFeatured(r.data)).catch(() => {});
    api.get("/products", { params: { sort: "newest", limit: 8 } })
      .then((r) => setNewest(r.data.products))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Khu trên: menu danh mục dọc bên trái + banner carousel
          (flyout danh mục phủ lên banner khi hover) */}
      <section className="home-top">
        <CategorySidebar />
        <HeroBanner />
      </section>

      {/* Sản phẩm nổi bật */}
      <div className="section-head">
        <h2>Sản phẩm nổi bật</h2>
        <Link to="/products" className="link">Xem tất cả</Link>
      </div>
      <div className="product-grid">
        {featured.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>

      {/* Mới về */}
      <div className="section-head">
        <h2>Mới về</h2>
        <Link to="/products?sort=newest" className="link">Xem tất cả</Link>
      </div>
      <div className="product-grid">
        {newest.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>

      {/* Cam kết dịch vụ */}
      <h2 style={{ marginTop: 26 }}>Vì sao chọn HungSaiGon?</h2>
      <div className="why-grid">
        <div className="why-card">
          <SealCheck size={22} />
          <div><b>Hàng chính hãng</b>Nguồn gốc rõ ràng, bảo hành 12 tháng.</div>
        </div>
        <div className="why-card">
          <Truck size={22} />
          <div><b>Giao nhanh</b>Miễn phí vận chuyển cho đơn từ 500.000₫.</div>
        </div>
        <div className="why-card">
          <CreditCard size={22} />
          <div><b>Thanh toán linh hoạt</b>COD hoặc chuyển khoản, kiểm tra hàng trước.</div>
        </div>
        <div className="why-card">
          <Headset size={22} />
          <div><b>Hỗ trợ tận tâm</b>Tư vấn cấu hình theo đúng nhu cầu.</div>
        </div>
      </div>
    </div>
  );
}
