// ============================================================
// MISC.ROUTE.JS - ROUTES CHO: BRAND, BANNER, FEEDBACK, ADDRESS, COUPON
// ------------------------------------------------------------
// Gom router nhỏ vào 1 file, export riêng từng router để server.js
// mount vào các prefix khác nhau (/api/brands, /api/banners...).
// Quy tắc quen thuộc: public đọc / admin ghi / dữ liệu cá nhân cần login.
// ============================================================

import express from "express";
import rateLimit from "express-rate-limit";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getBrands, createBrand, updateBrand, deleteBrand,
  getActiveBanners, getAllBanners, createBanner, updateBanner, deleteBanner,
  createFeedback, getFeedbacks, resolveFeedback,
  getMyAddresses, createAddress, updateAddress, deleteAddress,
} from "../controllers/misc.controller.js";
import {
  applyCoupon, getAvailableCoupons, getCoupons, createCoupon, updateCoupon, deleteCoupon,
} from "../controllers/coupon.controller.js";
import {
  createBrandSchema, updateBrandSchema,
  createBannerSchema, updateBannerSchema,
  createFeedbackSchema,
  createAddressSchema, updateAddressSchema,
  createCouponSchema, updateCouponSchema, applyCouponSchema,
} from "../validations/misc.validation.js";

// ---------- BRAND ----------
export const brandRouter = express.Router();
brandRouter.get("/", getBrands); // public
brandRouter.post("/", protectRoute, requireAdmin, validate(createBrandSchema), createBrand);
brandRouter.put("/:id", protectRoute, requireAdmin, validate(updateBrandSchema), updateBrand);
brandRouter.delete("/:id", protectRoute, requireAdmin, deleteBrand);

// ---------- BANNER ----------
export const bannerRouter = express.Router();
bannerRouter.get("/", getActiveBanners); // public - trang chủ
bannerRouter.get("/all", protectRoute, requireAdmin, getAllBanners);
bannerRouter.post("/", protectRoute, requireAdmin, validate(createBannerSchema), createBanner);
bannerRouter.put("/:id", protectRoute, requireAdmin, validate(updateBannerSchema), updateBanner);
bannerRouter.delete("/:id", protectRoute, requireAdmin, deleteBanner);

// ---------- FEEDBACK ----------
// Rate limit riêng cho form public: 5 lần gửi / 15 phút / IP - chống bot spam
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: "Bạn gửi góp ý quá nhiều, vui lòng thử lại sau" },
  standardHeaders: true,
  legacyHeaders: false,
});
export const feedbackRouter = express.Router();
feedbackRouter.post("/", feedbackLimiter, validate(createFeedbackSchema), createFeedback); // public
feedbackRouter.get("/", protectRoute, requireAdmin, getFeedbacks);
feedbackRouter.put("/:id/resolve", protectRoute, requireAdmin, resolveFeedback);

// ---------- ADDRESS (toàn bộ cần đăng nhập) ----------
export const addressRouter = express.Router();
addressRouter.use(protectRoute);
addressRouter.get("/", getMyAddresses);
addressRouter.post("/", validate(createAddressSchema), createAddress);
addressRouter.put("/:id", validate(updateAddressSchema), updateAddress);
addressRouter.delete("/:id", deleteAddress);

// ---------- COUPON ----------
export const couponRouter = express.Router();
// Khách kiểm tra mã: cần đăng nhập (mã gắn với hành vi mua hàng)
couponRouter.post("/apply", protectRoute, validate(applyCouponSchema), applyCoupon);
// Voucher khách dùng được - hiển thị ở dashboard cá nhân (v7)
couponRouter.get("/available", protectRoute, getAvailableCoupons);
// Admin CRUD
couponRouter.get("/", protectRoute, requireAdmin, getCoupons);
couponRouter.post("/", protectRoute, requireAdmin, validate(createCouponSchema), createCoupon);
couponRouter.put("/:id", protectRoute, requireAdmin, validate(updateCouponSchema), updateCoupon);
couponRouter.delete("/:id", protectRoute, requireAdmin, deleteCoupon);
