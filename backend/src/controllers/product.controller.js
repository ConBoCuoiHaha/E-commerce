// ============================================================
// PRODUCT.CONTROLLER.JS - SẢN PHẨM: LỌC FACETED, CRUD, REVIEW
// ------------------------------------------------------------
// PHẦN QUAN TRỌNG NHẤT PHASE 1: hàm getProducts với LỌC FACETED.
//
// "Faceted search" là kiểu lọc của các trang TMĐT như ThinkPro:
// sidebar có nhiều nhóm filter (hãng, CPU, RAM, giá...) và mỗi lựa
// chọn hiện kèm SỐ LƯỢNG sản phẩm khớp, vd "Lenovo (12)", "Dell (8)".
//
// Để làm được, ta dùng MongoDB Aggregation Pipeline với toán tử $facet:
//   $facet cho phép chạy NHIỀU nhánh thống kê SONG SONG trên cùng một
//   tập dữ liệu đã lọc - một nhánh lấy danh sách sản phẩm (phân trang),
//   các nhánh còn lại đếm số lượng theo từng thuộc tính (brand, cpu...).
//
// BẢO MẬT: tuyệt đối KHÔNG đổ thẳng req.query vào câu lệnh Mongo.
// Ta tự tay nhặt từng giá trị, ép kiểu, kiểm tra whitelist -> chống
// NoSQL injection và query độc hại.
// ============================================================

import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Review from "../models/review.model.js";
import { uniqueSlug } from "../utils/slugify.js";

// Hàm phụ: chuyển query param thành MẢNG (hỗ trợ chọn nhiều giá trị).
// ?brand=Lenovo&brand=Dell  -> req.query.brand = ["Lenovo","Dell"]
// ?brand=Lenovo             -> req.query.brand = "Lenovo" -> ép thành ["Lenovo"]
// Đồng thời lọc bỏ phần tử không phải string (chống payload object lạ).
const toStringArray = (value) => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return [value];
  return [];
};

// ------------------------------------------------------------
// GET /api/products - Danh sách + LỌC FACETED (public)
// Query hỗ trợ:
//   ?keyword=  ?category=<slug>  ?brand=<...>  ?cpu=<...>  ?ram=<...>
//   ?needs=<...>  ?minPrice=  ?maxPrice=  ?inStock=true
//   ?sort=  ?page=  ?limit=
// ------------------------------------------------------------
export const getProducts = async (req, res) => {
  // ============ 1. XÂY DỰNG BỘ LỌC AN TOÀN ============
  const match = { isActive: true };

  // --- Từ khóa: tìm gần đúng trong tên (regex, escape chống ReDoS) ---
  if (typeof req.query.keyword === "string" && req.query.keyword.trim()) {
    const safe = req.query.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    match.name = { $regex: safe, $options: "i" };
  }

  // --- Danh mục: client gửi slug, ta đổi sang _id ---
  if (typeof req.query.category === "string" && req.query.category) {
    const category = await Category.findOne({ slug: req.query.category });
    if (!category) {
      // Slug không tồn tại -> trả rỗng (không lỗi)
      return res.json({ products: [], page: 1, totalPages: 0, totalProducts: 0, facets: {} });
    }
    match.category = category._id;
  }

  // --- Các filter dạng "chọn nhiều" -> dùng $in ---
  const brands = toStringArray(req.query.brand);
  if (brands.length) match["attributes.brand"] = { $in: brands };

  const cpus = toStringArray(req.query.cpu);
  if (cpus.length) match["attributes.cpu"] = { $in: cpus };

  const rams = toStringArray(req.query.ram);
  if (rams.length) match["attributes.ram"] = { $in: rams };

  const needs = toStringArray(req.query.needs);
  // needs là mảng trong DB -> $in khớp nếu sản phẩm có BẤT KỲ nhu cầu nào được chọn
  if (needs.length) match["attributes.needs"] = { $in: needs };

  // --- Khoảng giá: ép Number, loại NaN ---
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    match.price = {};
    if (Number.isFinite(minPrice)) match.price.$gte = minPrice;
    if (Number.isFinite(maxPrice)) match.price.$lte = maxPrice;
  }

  // --- Chỉ còn hàng ---
  if (req.query.inStock === "true") match.countInStock = { $gt: 0 };

  // ============ 2. SẮP XẾP (whitelist) ============
  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
  };
  const sort = sortMap[req.query.sort] || sortMap.newest;

  // ============ 3. PHÂN TRANG (giới hạn limit) ============
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const skip = (page - 1) * limit;

  // ============ 4. AGGREGATION với $facet ============
  // $facet chạy song song nhiều nhánh trên cùng tập đã $match:
  //   - meta:        đếm tổng số sản phẩm (để tính số trang)
  //   - data:        danh sách sản phẩm trang hiện tại (đã sort/skip/limit)
  //   - brandFacet:  đếm số sản phẩm theo từng hãng
  //   - cpuFacet:    đếm theo từng CPU
  //   - ramFacet:    đếm theo từng RAM
  const pipeline = [
    { $match: match },
    {
      $facet: {
        meta: [{ $count: "total" }],
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          // (v4: review đã tách collection riêng, document Product gọn sẵn)
        ],
        // Mỗi facet: gom nhóm theo trường, đếm số lượng, bỏ giá trị rỗng
        brandFacet: [
          { $group: { _id: "$attributes.brand", count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { count: -1 } },
        ],
        cpuFacet: [
          { $group: { _id: "$attributes.cpu", count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { count: -1 } },
        ],
        ramFacet: [
          { $group: { _id: "$attributes.ram", count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
          { $sort: { count: -1 } },
        ],
      },
    },
  ];

  const [result] = await Product.aggregate(pipeline);

  // meta là mảng (rỗng nếu không có sản phẩm) -> lấy total an toàn
  const totalProducts = result.meta[0]?.total || 0;

  // Đổ category cho từng sản phẩm (aggregate không tự populate).
  // populate thủ công bằng Product.populate cho mảng data.
  await Product.populate(result.data, { path: "category", select: "name slug" });

  res.json({
    products: result.data,
    page,
    totalPages: Math.ceil(totalProducts / limit),
    totalProducts,
    // facets: dữ liệu để frontend vẽ sidebar lọc kèm số lượng
    facets: {
      brand: result.brandFacet.map((f) => ({ value: f._id, count: f.count })),
      cpu: result.cpuFacet.map((f) => ({ value: f._id, count: f.count })),
      ram: result.ramFacet.map((f) => ({ value: f._id, count: f.count })),
    },
  });
};

// ------------------------------------------------------------
// GET /api/products/:slug - Chi tiết 1 sản phẩm (public)
// ------------------------------------------------------------
export const getProductBySlug = async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    isActive: true,
  }).populate("category", "name slug");

  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  res.json(product);
};

// ------------------------------------------------------------
// Hàm phụ: từ mảng variants, tính price (rẻ nhất) và countInStock (tổng)
// để cập nhật 2 trường hiển thị cấp Product.
// ------------------------------------------------------------
const computeProductPricing = (variants) => {
  if (!variants || variants.length === 0) return null;
  const price = Math.min(...variants.map((v) => v.price));
  const countInStock = variants.reduce((sum, v) => sum + v.countInStock, 0);
  return { price, countInStock };
};

// ------------------------------------------------------------
// POST /api/products - Tạo sản phẩm (admin)
// ------------------------------------------------------------
export const createProduct = async (req, res) => {
  const categoryExists = await Category.findById(req.body.category);
  if (!categoryExists) return res.status(400).json({ message: "Danh mục không tồn tại" });

  const slug = await uniqueSlug(Product, req.body.name);

  // Nếu có variants thì tính lại price/countInStock từ variants
  const pricing = computeProductPricing(req.body.variants);
  const data = { ...req.body, slug, ...(pricing || {}) };

  const product = await Product.create(data);
  res.status(201).json(product);
};

// ------------------------------------------------------------
// PUT /api/products/:id - Cập nhật sản phẩm (admin)
// ------------------------------------------------------------
export const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) return res.status(400).json({ message: "Danh mục không tồn tại" });
  }

  if (req.body.name && req.body.name !== product.name) {
    product.slug = await uniqueSlug(Product, req.body.name);
  }

  Object.assign(product, req.body);

  // Cập nhật variants -> tính lại price/countInStock
  const pricing = computeProductPricing(product.variants);
  if (pricing) {
    product.price = pricing.price;
    product.countInStock = pricing.countInStock;
  }

  const updated = await product.save();
  res.json(updated);
};

// ------------------------------------------------------------
// GET /api/products/admin/all - Danh sách cho ADMIN (v8)
// Khác danh sách public: trả CẢ sản phẩm đã ẩn (isActive=false)
// -> admin xem được hàng đã ẩn để bật bán lại hoặc xóa hẳn.
// (Bug cũ: admin dùng API public nên sản phẩm vừa ẩn là "biến mất"
//  khỏi trang quản trị, không có cách nào khôi phục!)
// ------------------------------------------------------------
export const getAdminProducts = async (req, res) => {
  const products = await Product.find()
    .populate("category", "name slug")
    .sort({ isActive: -1, createdAt: -1 }); // đang bán lên trước
  res.json(products);
};

// ------------------------------------------------------------
// DELETE /api/products/:id - Ẩn sản phẩm (admin) - SOFT DELETE
// PUT với isActive=true để hiện lại (dùng updateProduct sẵn có)
// ------------------------------------------------------------
export const deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  res.json({ message: "Đã ẩn sản phẩm khỏi cửa hàng" });
};

// ------------------------------------------------------------
// DELETE /api/products/:id/hard - XÓA HẲN sản phẩm (admin) - v8
//
// NGHIỆP VỤ QUAN TRỌNG: chỉ được xóa hẳn khi CHƯA CÓ ĐƠN HÀNG nào
// tham chiếu tới sản phẩm. Nếu xóa bừa, đơn hàng cũ sẽ trỏ tới
// "sản phẩm ma" - mất lịch sử bán hàng, sai báo cáo. Trường hợp đó
// chỉ được ẨN (soft delete).
//
// Xóa hẳn thì phải DỌN SẠCH dữ liệu liên quan (cascading cleanup):
// review, wishlist, item trong giỏ hàng của khách - nếu không sẽ
// thành "dữ liệu mồ côi" chiếm chỗ và gây lỗi populate.
// ------------------------------------------------------------
export const hardDeleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  // Chặn xóa nếu đã có đơn hàng tham chiếu
  const Order = (await import("../models/order.model.js")).default;
  const hasOrders = await Order.exists({ "orderItems.product": product._id });
  if (hasOrders) {
    return res.status(400).json({
      message:
        "Sản phẩm đã có đơn hàng tham chiếu - không thể xóa hẳn (sẽ mất lịch sử bán hàng). Hãy dùng nút Ẩn.",
    });
  }

  // Dọn dữ liệu liên quan song song rồi xóa sản phẩm
  const Review = (await import("../models/review.model.js")).default;
  const Wishlist = (await import("../models/wishlist.model.js")).default;
  const Cart = (await import("../models/cart.model.js")).default;
  await Promise.all([
    Review.deleteMany({ product: product._id }),
    Wishlist.deleteMany({ product: product._id }),
    // $pull: gỡ item của sản phẩm này khỏi MỌI giỏ hàng
    Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
  ]);
  await product.deleteOne();

  res.json({ message: `Đã xóa hẳn sản phẩm "${product.name}" cùng review/wishlist liên quan` });
};

// ------------------------------------------------------------
// GET /api/products/:id/reviews - Danh sách đánh giá PHÂN TRANG (public)
// Đây là lợi ích chính của việc tách Review ra collection riêng:
// sản phẩm 10.000 review vẫn chỉ trả về 5-10 cái mỗi lần.
// ------------------------------------------------------------
export const getProductReviews = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));

  const [total, reviews] = await Promise.all([
    Review.countDocuments({ product: req.params.id }),
    Review.find({ product: req.params.id })
      .sort({ createdAt: -1 }) // mới nhất trước
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({ reviews, page, totalPages: Math.ceil(total / limit), total });
};

// ------------------------------------------------------------
// POST /api/products/:id/reviews - Viết đánh giá (user đã đăng nhập)
// ------------------------------------------------------------
export const createReview = async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findOne({ _id: req.params.id, isActive: true });
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  // LỖI ẨN ĐÃ SỬA (audit v9): trước đây AI đăng nhập cũng review được
  // dù chưa từng mua -> dễ bị spam đánh giá ảo, mất uy tín shop.
  // Chuẩn nghiệp vụ TMĐT: chỉ khách có đơn ĐÃ GIAO chứa sản phẩm này
  // mới được đánh giá ("verified purchase").
  const Order = (await import("../models/order.model.js")).default;
  const hasPurchased = await Order.exists({
    user: req.user._id,
    status: "delivered",
    "orderItems.product": product._id,
  });
  if (!hasPurchased) {
    return res.status(403).json({
      message: "Chỉ khách đã mua và nhận hàng thành công mới có thể đánh giá sản phẩm này",
    });
  }

  // Tạo review trong collection riêng. Nếu user đã review sản phẩm này,
  // COMPOUND UNIQUE INDEX (user+product) sẽ ném lỗi 11000 - ta bắt lại
  // và báo thân thiện. Chặn ở TẦNG DB nên không sợ race condition
  // (2 request cùng lúc thì vẫn chỉ 1 cái được ghi).
  try {
    await Review.create({
      product: product._id,
      user: req.user._id,
      name: req.user.name,
      rating,
      comment,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi" });
    }
    throw err; // lỗi khác -> để errorHandler xử lý
  }

  // Tính lại rating trung bình + tổng số review bằng AGGREGATION
  // (tính trên DB, không kéo hết review về Node)
  const [stats] = await Review.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  product.rating = Math.round(stats.avg * 10) / 10; // làm tròn 1 chữ số
  product.numReviews = stats.count;
  await product.save();

  res.status(201).json({ message: "Cảm ơn bạn đã đánh giá!" });
};

// ------------------------------------------------------------
// GET /api/products/featured/list - Sản phẩm nổi bật cho trang chủ (public)
// ------------------------------------------------------------
export const getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .select("-reviews")
    .populate("category", "name slug")
    .limit(8);
  res.json(products);
};

// ------------------------------------------------------------
// GET /api/products/compare/list?ids=a,b,c - SO SÁNH SẢN PHẨM (public)
// Nhận tối đa 4 id, trả về sản phẩm kèm attributes/variants để
// frontend vẽ bảng so sánh cạnh nhau.
// BẢO MẬT: tự tách chuỗi, lọc đúng định dạng ObjectId, giới hạn 4
// -> không thể nhét query độc hại hay xin cả nghìn sản phẩm.
// ------------------------------------------------------------
export const getCompareProducts = async (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[0-9a-fA-F]{24}$/.test(s)) // chỉ giữ ObjectId hợp lệ
    .slice(0, 4); // tối đa 4 sản phẩm

  if (ids.length === 0) return res.json([]);

  const products = await Product.find({ _id: { $in: ids }, isActive: true })
    .select("-reviews")
    .populate("category", "name slug");
  res.json(products);
};
