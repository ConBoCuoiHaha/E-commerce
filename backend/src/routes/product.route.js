// ============================================================
// PRODUCT.ROUTE.JS - ENDPOINT SẢN PHẨM
// ------------------------------------------------------------
// THỨ TỰ ROUTE QUAN TRỌNG: route cụ thể ("/featured/list") phải khai
// báo TRƯỚC route động "/:slug" - nếu không "featured" sẽ bị hiểu là slug.
// ============================================================

import express from "express";
import {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  getCompareProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  createReview,
  getProductReviews,
} from "../controllers/product.controller.js";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  createReviewSchema,
} from "../validations/product.validation.js";

const router = express.Router();

// --- Public ---
router.get("/", getProducts); // danh sách + lọc faceted + tìm kiếm + phân trang
router.get("/featured/list", getFeaturedProducts); // sản phẩm nổi bật (trang chủ)
router.get("/compare/list", getCompareProducts); // so sánh tối đa 4 sản phẩm
router.get("/:slug", getProductBySlug); // chi tiết theo slug

// --- Đánh giá: đọc public (phân trang), viết cần đăng nhập ---
router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", protectRoute, validate(createReviewSchema), createReview);

// --- Admin: quản lý sản phẩm ---
// LƯU Ý THỨ TỰ: "/admin/all" phải đứng TRƯỚC "/:slug" (route tham lam)
router.get("/admin/all", protectRoute, requireAdmin, getAdminProducts); // gồm cả hàng đã ẩn (v8)
router.post("/", protectRoute, requireAdmin, validate(createProductSchema), createProduct);
router.put("/:id", protectRoute, requireAdmin, validate(updateProductSchema), updateProduct);
router.delete("/:id", protectRoute, requireAdmin, deleteProduct); // ẩn (soft delete)
router.delete("/:id/hard", protectRoute, requireAdmin, hardDeleteProduct); // xóa hẳn (v8)

export default router;
