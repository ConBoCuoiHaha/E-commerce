import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import api from "../lib/axios.js";
import ProductCard from "../components/ProductCard.jsx";
import { usePageMeta } from "../lib/usePageMeta.js";

// Trang danh sách + BỘ LỌC FACETED.
// Toàn bộ trạng thái lọc nằm trên URL (searchParams) -> share link được,
// bấm Back hoạt động đúng, và đồng bộ với thanh danh mục trên Navbar.
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  usePageMeta(
    params.get("keyword") ? `Tìm kiếm: ${params.get("keyword")}` : "Tất cả sản phẩm",
    "Danh sách laptop và thiết bị công nghệ chính hãng với bộ lọc theo hãng, CPU, RAM, giá."
  );
  const [data, setData] = useState({ products: [], totalPages: 0, totalProducts: 0, facets: {} });
  const [loading, setLoading] = useState(true);
  const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");

  // Gọi API mỗi khi URL đổi (params.toString() là dependency)
  useEffect(() => {
    setLoading(true);
    api
      .get(`/products?${params.toString()}`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [params]);

  // --- Cập nhật URL: filter dạng chọn-nhiều (brand, cpu, ram) ---
  const toggleMulti = (key, value) => {
    const next = new URLSearchParams(params);
    const current = next.getAll(key);
    next.delete(key);
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updated.forEach((v) => next.append(key, v));
    next.delete("page"); // đổi filter -> quay về trang 1
    setParams(next);
  };

  const setSingle = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  const applyPrice = () => {
    const next = new URLSearchParams(params);
    minPrice ? next.set("minPrice", minPrice) : next.delete("minPrice");
    maxPrice ? next.set("maxPrice", maxPrice) : next.delete("maxPrice");
    next.delete("page");
    setParams(next);
  };

  const goPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next);
  };

  const page = Number(params.get("page")) || 1;

  // v9: nhóm filter THU GỌN/MỞ RỘNG bằng mũi tên - người dùng không
  // phải cuộn qua danh sách dài. Mặc định chỉ mở "Hãng"; nhóm nào
  // ĐANG CÓ lựa chọn được tick thì tự mở (không giấu filter đang áp).
  const [openGroups, setOpenGroups] = useState({ brand: true });
  const toggleGroup = (key) =>
    setOpenGroups((g) => ({ ...g, [key]: !g[key] }));

  // Vẽ 1 nhóm filter từ dữ liệu facets (có số lượng từng nhánh)
  const FacetGroup = ({ title, facetKey, options }) => {
    if (!options?.length) return null;
    const selectedCount = params.getAll(facetKey).length;
    const isOpen = openGroups[facetKey] || selectedCount > 0;
    return (
      <div className="facet-group">
        {/* Header bấm được: tiêu đề + số filter đang chọn + mũi tên */}
        <button type="button" className="facet-head" onClick={() => toggleGroup(facetKey)}>
          <h4 style={{ margin: 0 }}>
            {title}
            {selectedCount > 0 && <span className="noti-badge" style={{ marginLeft: 6 }}>{selectedCount}</span>}
          </h4>
          {isOpen ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        </button>
        {isOpen &&
          options.map((o) => (
            <label key={o.value} className="facet-option">
              <input
                type="checkbox"
                checked={params.getAll(facetKey).includes(o.value)}
                onChange={() => toggleMulti(facetKey, o.value)}
              />
              {o.value}
              <span className="count">({o.count})</span>
            </label>
          ))}
      </div>
    );
  };

  return (
    <div className="shop-layout">
      {/* ----- Sidebar lọc ----- */}
      <aside className="sidebar">
        <FacetGroup title="Hãng" facetKey="brand" options={data.facets.brand} />
        <FacetGroup title="CPU" facetKey="cpu" options={data.facets.cpu} />
        <FacetGroup title="RAM" facetKey="ram" options={data.facets.ram} />

        <div className="facet-group">
          <h4>Khoảng giá (₫)</h4>
          <div className="price-inputs">
            <input type="number" placeholder="Từ" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <span>—</span>
            <input type="number" placeholder="Đến" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={applyPrice}>Áp dụng</button>
        </div>

        <div className="facet-group">
          <label className="facet-option">
            <input
              type="checkbox"
              checked={params.get("inStock") === "true"}
              onChange={(e) => setSingle("inStock", e.target.checked ? "true" : "")}
            />
            Chỉ hiện còn hàng
          </label>
        </div>

        <button className="btn btn-sm" onClick={() => setParams(new URLSearchParams())}>
          Xóa tất cả bộ lọc
        </button>
      </aside>

      {/* ----- Danh sách ----- */}
      <section>
        <div className="toolbar">
          <span className="meta">{data.totalProducts} sản phẩm</span>
          <select value={params.get("sort") || "newest"} onChange={(e) => setSingle("sort", e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá thấp → cao</option>
            <option value="price_desc">Giá cao → thấp</option>
            <option value="rating">Đánh giá cao</option>
          </select>
        </div>

        {loading ? (
          <p className="info-text">Đang tải...</p>
        ) : data.products.length === 0 ? (
          <p className="info-text">Không tìm thấy sản phẩm phù hợp bộ lọc</p>
        ) : (
          <div className="product-grid">
            {data.products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: data.totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`btn btn-sm ${page === i + 1 ? "active" : ""}`}
                onClick={() => goPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
