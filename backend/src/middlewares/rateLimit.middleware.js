// ============================================================
// RATELIMIT.MIDDLEWARE.JS - GIỚI HẠN TẦN SUẤT REQUEST
// ------------------------------------------------------------
// Rate limiting chống lại:
//   1. BRUTE-FORCE: kẻ xấu thử hàng nghìn mật khẩu vào ô đăng nhập
//   2. SPAM API: bot gọi API liên tục làm tốn tài nguyên server
//
// BÀI HỌC TỪ LỖI THẬT (v7): ngưỡng toàn cục 300 req/15 phút nghe có
// vẻ nhiều nhưng KHÔNG đủ cho SPA thật:
//   - Mỗi trang admin gọi 2-3 API; React StrictMode (dev) còn chạy
//     useEffect 2 LẦN -> mỗi lần mở trang = 4-6 request.
//   - Duyệt qua lại các mục quản trị vài phút là cạn quota -> toàn bộ
//     website "chết" với lỗi 429 dù người dùng hoàn toàn hợp lệ.
// Nguyên tắc đặt ngưỡng: limiter TOÀN CỤC chỉ để chặn BOT bất thường
// (hàng nghìn req/phút), phải RỘNG hơn nhiều so với mức người dùng
// thật có thể chạm tới. Chống brute-force đã có limiter RIÊNG chặt
// hơn ở từng route nhạy cảm.
// ============================================================

import rateLimit from "express-rate-limit";

// Tầng 1: áp cho mọi request (gắn trong server.js)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // cửa sổ 15 phút
  limit: 2000, // mỗi IP tối đa 2000 request / 15 phút (~2.2 req/giây)
  message: { message: "Bạn gửi quá nhiều yêu cầu, vui lòng thử lại sau" },
  standardHeaders: true, // trả header RateLimit-* chuẩn
  legacyHeaders: false,
  // Bỏ qua đếm với ảnh (/api/images/...): 1 trang sản phẩm có thể tải
  // hàng chục ảnh - đó là tài nguyên tĩnh, không phải hành vi spam.
  skip: (req) => req.path.startsWith("/api/images/"),
});

// Tầng 2: chỉ áp cho route nhạy cảm (login/signup/quên mật khẩu...)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // cửa sổ 15 phút
  limit: 10, // mỗi IP chỉ được 10 lần THẤT BẠI / 15 phút
  message: {
    message: "Thử đăng nhập quá nhiều lần, vui lòng thử lại sau 15 phút",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Đăng nhập THÀNH CÔNG không bị tính vào quota - chỉ đếm lần THẤT BẠI
  // (đúng bản chất chống brute-force)
  skipSuccessfulRequests: true,
});
