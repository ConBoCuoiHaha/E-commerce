import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CaretRight, Laptop, Keyboard, Mouse, Monitor, Cpu, HardDrives, SquaresFour,
} from "@phosphor-icons/react";
import api from "../lib/axios.js";

// Menu danh mục DỌC bên trái (kiểu thinkpro):
// - Mỗi dòng: icon + tên danh mục + mũi tên CaretRight bên phải
// - Hover vào dòng -> mở FLYOUT panel phủ lên vùng banner, hiện các
//   liên kết lọc nhanh theo HÃNG (lấy từ API facets, có cache)
const CAT_ICONS = {
  laptop: Laptop,
  "ban-phim": Keyboard,
  chuot: Mouse,
  "man-hinh": Monitor,
  ram: Cpu,
  "o-cung-ssd": HardDrives,
};

export default function CategorySidebar() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [hovered, setHovered] = useState(null); // slug danh mục đang hover
  const [brandCache, setBrandCache] = useState({}); // slug -> [{value,count}]

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // Hover danh mục -> tải danh sách hãng (1 lần, cache lại)
  const handleHover = (slug) => {
    setHovered(slug);
    if (brandCache[slug]) return;
    api
      .get("/products", { params: { category: slug, limit: 1 } })
      .then((res) =>
        setBrandCache((prev) => ({ ...prev, [slug]: res.data.facets.brand || [] }))
      )
      .catch(() => {});
  };

  const hoveredCat = categories.find((c) => c.slug === hovered);

  return (
    <>
      <aside className="cat-menu" onMouseLeave={() => setHovered(null)}>
        {categories.map((c) => {
          const Icon = CAT_ICONS[c.slug] || SquaresFour;
          return (
            <button
              key={c._id}
              className={`cat-menu-item ${hovered === c.slug ? "active" : ""}`}
              onMouseEnter={() => handleHover(c.slug)}
              onClick={() => navigate(`/products?category=${c.slug}`)}
            >
              <Icon size={20} />
              {c.name}
              <span className="caret"><CaretRight size={14} weight="bold" /></span>
            </button>
          );
        })}
      </aside>

      {/* Flyout mở rộng - hiện khi hover, phủ lên vùng banner */}
      {hoveredCat && (
        <div
          className="cat-flyout"
          onMouseEnter={() => setHovered(hoveredCat.slug)}
          onMouseLeave={() => setHovered(null)}
        >
          <h3>{hoveredCat.name}</h3>

          <div className="fly-group">
            <div className="fly-label">Theo hãng</div>
            <div className="fly-links">
              {(brandCache[hoveredCat.slug] || []).map((b) => (
                <Link key={b.value} to={`/products?category=${hoveredCat.slug}&brand=${encodeURIComponent(b.value)}`}>
                  {b.value} ({b.count})
                </Link>
              ))}
            </div>
          </div>

          <div className="fly-group">
            <div className="fly-label">Khám phá</div>
            <div className="fly-links">
              <Link to={`/products?category=${hoveredCat.slug}`}>Tất cả {hoveredCat.name}</Link>
              <Link to={`/products?category=${hoveredCat.slug}&sort=price_asc`}>Giá tốt nhất</Link>
              <Link to={`/products?category=${hoveredCat.slug}&sort=rating`}>Đánh giá cao</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
