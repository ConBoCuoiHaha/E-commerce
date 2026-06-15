// ============================================================
// SERVER.JS - ĐIỂM KHỞI ĐỘNG (ENTRY POINT) CỦA BACKEND
// ------------------------------------------------------------
// File này chịu trách nhiệm:
//   1. Nạp + KIỂM TRA biến môi trường (fail fast nếu thiếu)
//   2. Tạo app Express và gắn các middleware BẢO MẬT toàn cục
//   3. Gắn các nhóm route
//   4. Gắn middleware xử lý lỗi tập trung (PHẢI nằm cuối)
//   5. Kết nối MongoDB rồi mới mở cổng + graceful shutdown
//
// LƯU Ý EXPRESS 5: tự bắt lỗi async trong controller và chuyển tới
// error handler - không cần bọc try/catch từng hàm.
// ============================================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import { connectDB } from "./libs/db.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";

import authRoutes from "./routes/auth.route.js";
import categoryRoutes from "./routes/category.route.js";
import productRoutes from "./routes/product.route.js";
import orderRoutes from "./routes/order.route.js";
import wishlistRoutes from "./routes/wishlist.route.js";
import cartRoutes from "./routes/cart.route.js";
import {
  brandRouter,
  bannerRouter,
  feedbackRouter,
  addressRouter,
  couponRouter,
} from "./routes/misc.route.js";
import uploadRoutes from "./routes/upload.route.js";
import imageRoutes from "./routes/image.route.js";
import { settingRouter, pageRouter } from "./routes/content.route.js";
import inventoryRoutes, { accountingRouter } from "./routes/inventory.route.js";
import membershipRoutes from "./routes/membership.route.js";
import { startBankMailWatcher } from "./services/bankMailWatcher.js";
import { startStudentExpiryCron } from "./services/studentExpiryCron.js";

dotenv.config();

// ------------------------------------------------------------
// 0. KIỂM TRA BIẾN MÔI TRƯỜNG (fail fast)
//    Sản phẩm production "chết ngay khi khởi động vì thiếu config"
//    TỐT HƠN NHIỀU so với "chạy được nhưng lỗi ngầm lúc 2 giờ sáng".
//    Vd: thiếu JWT_ACCESS_SECRET -> jwt.sign ném lỗi ở MỖI lần login,
//    còn thiếu ở đây thì phát hiện ngay từ giây đầu tiên.
// ------------------------------------------------------------
const REQUIRED_ENV = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "EMAIL_USER",
  "EMAIL_APP_PASSWORD",
  "CLIENT_URL",
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`);
  console.error("   Kiểm tra file .env (tham khảo .env.example)");
  process.exit(1);
}
// 2 secret PHẢI khác nhau - nếu trùng, refresh token có thể "giả làm"
// access token (mất ý nghĩa tách 2 loại token)
if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error("❌ JWT_ACCESS_SECRET và JWT_REFRESH_SECRET không được trùng nhau!");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------
// 1. MIDDLEWARE BẢO MẬT & TIỆN ÍCH TOÀN CỤC (thứ tự quan trọng)
// ------------------------------------------------------------

// Khi deploy sau reverse proxy (nginx, Render, Railway...), Express
// phải tin header X-Forwarded-For để rate-limit đếm ĐÚNG IP khách
// thay vì đếm IP của proxy (mọi người chung 1 IP -> chặn nhầm cả loạt).
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// helmet: ~12 HTTP header bảo mật (nosniff, frame-ancestors, HSTS...)
// COOP đổi sang "same-origin-allow-popups": mặc định "same-origin" của
// helmet CHẶN cửa sổ popup Google Sign-In gửi postMessage về trang
// (cảnh báo "Cross-Origin-Opener-Policy would block window.postMessage").
// allow-popups vẫn giữ bảo vệ COOP nhưng cho phép popup do TA mở giao tiếp.
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// cors: cho phép 2 app FRONTEND của ta gọi + gửi kèm cookie:
//   - CLIENT_URL  (web bán hàng, cổng 5173)
//   - ADMIN_URL   (app quản trị riêng, cổng 5174 - v10)
// Dùng mảng whitelist; chỉ origin trong danh sách mới được gửi cookie.
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL || "http://localhost:5174",
].filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      // origin undefined = request cùng máy chủ (curl/health check) -> cho qua
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Origin không được phép bởi CORS"));
    },
    credentials: true,
  })
);

// Đọc body JSON, chặn body > 10kb (chống payload khổng lồ)
app.use(express.json({ limit: "10kb" }));

// Đọc cookie (JWT nằm trong cookie httpOnly)
app.use(cookieParser());

// Rate limit toàn cục (route nhạy cảm còn có limiter chặt hơn riêng)
app.use(globalLimiter);

// ------------------------------------------------------------
// 2. CÁC NHÓM ROUTE
// ------------------------------------------------------------
app.use("/api/auth", authRoutes); // đăng ký/đăng nhập/refresh/email
app.use("/api/categories", categoryRoutes); // danh mục
app.use("/api/products", productRoutes); // sản phẩm + đánh giá
app.use("/api/orders", orderRoutes); // đơn hàng
app.use("/api/cart", cartRoutes); // giỏ hàng server-side (v4)
app.use("/api/wishlist", wishlistRoutes); // yêu thích
app.use("/api/brands", brandRouter); // thương hiệu
app.use("/api/banners", bannerRouter); // banner trang chủ
app.use("/api/feedback", feedbackRouter); // phản hồi góp ý
app.use("/api/addresses", addressRouter); // sổ địa chỉ
app.use("/api/coupons", couponRouter); // mã giảm giá
app.use("/api/upload", uploadRoutes); // upload ảnh (admin) - v5
app.use("/api/images", imageRoutes); // serve ảnh từ MongoDB - v5
app.use("/api/settings", settingRouter); // cấu hình cửa hàng (footer, bank) - v5
app.use("/api/pages", pageRouter); // bài viết "Thông tin hữu ích" - v5
app.use("/api/inventory", inventoryRoutes); // kho hàng: NCC, lô nhập, dashboard - v10
app.use("/api/accounting", accountingRouter); // cấu hình kế toán - v10
app.use("/api/membership", membershipRoutes); // HSSV + VIP - v10-P3

// Health check - dùng khi deploy/giám sát
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ------------------------------------------------------------
// 3. XỬ LÝ LỖI TẬP TRUNG (sau tất cả route)
// ------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ------------------------------------------------------------
// 4. KHỞI ĐỘNG + GRACEFUL SHUTDOWN
// ------------------------------------------------------------
let server;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT} (${process.env.NODE_ENV})`);
  });
  // Khởi động bộ đối soát email ngân hàng (bật/tắt qua BANK_MAIL_AUTO)
  startBankMailWatcher();
  // Khởi động cron gỡ quyền HSSV hết hạn (00:00 hằng ngày)
  startStudentExpiryCron();
});

// GRACEFUL SHUTDOWN: khi nhận tín hiệu dừng (Ctrl+C, hệ thống deploy
// tắt instance cũ), KHÔNG chết ngang mà:
//   1. Ngừng nhận request MỚI (server.close)
//   2. Chờ các request ĐANG xử lý hoàn tất
//   3. Đóng kết nối DB sạch sẽ rồi mới thoát
// -> Người dùng đang đặt hàng dở không bị đứt giữa chừng khi deploy.
const shutdown = async (signal) => {
  console.log(`\n⏹  Nhận tín hiệu ${signal} - đang tắt server an toàn...`);
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      console.log("✅ Đã đóng server + DB. Tạm biệt!");
      process.exit(0);
    });
    // Quá 10 giây chưa xong (request treo) thì buộc thoát
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(0);
  }
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
