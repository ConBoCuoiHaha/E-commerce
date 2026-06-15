// ============================================================
// AUTH.ROUTE.JS - ENDPOINT XÁC THỰC (Phase 3 đầy đủ)
// ------------------------------------------------------------
// Chuỗi middleware mỗi route: limiter -> validate -> controller.
// authLimiter áp cho MỌI route nhạy cảm có thể bị spam/brute-force:
// login, signup, forgot-password, reset-password, verify-email.
// ============================================================

import express from "express";
import {
  signup,
  login,
  googleLogin,
  logout,
  refresh,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validations/auth.validation.js";

const router = express.Router();

// --- Đăng ký / đăng nhập (mục tiêu brute-force số 1 -> limiter chặt) ---
router.post("/signup", authLimiter, validate(signupSchema), signup);
router.post("/login", authLimiter, validate(loginSchema), login);
// Đăng nhập Google: cũng giới hạn tần suất (chống spam gọi verify token).
// KHÔNG có validate(zod) vì body chỉ là 1 chuỗi credential dài, controller
// tự kiểm tra; verifyGoogleToken là lớp xác minh chính.
router.post("/google", authLimiter, googleLogin);

// --- Phiên đăng nhập ---
router.post("/refresh", refresh); // làm mới access token bằng refresh token
router.post("/logout", logout); // thu hồi refresh token + xóa cookie

// --- Xác thực email & quên mật khẩu ---
router.post("/verify-email", authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), resetPassword);

// --- Cần đăng nhập ---
router.get("/me", protectRoute, getMe);
router.put("/profile", protectRoute, validate(updateProfileSchema), updateProfile);

export default router;
