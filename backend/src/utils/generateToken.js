// ============================================================
// GENERATETOKEN.JS - CẶP ACCESS TOKEN + REFRESH TOKEN
// ------------------------------------------------------------
// TẠI SAO CẦN 2 TOKEN? (nâng cấp Phase 3)
//
//   ACCESS TOKEN (sống NGẮN ~15 phút):
//     - Gửi kèm mọi request để chứng minh "tôi là ai".
//     - Nếu bị đánh cắp, kẻ xấu chỉ dùng được TỐI ĐA 15 phút.
//
//   REFRESH TOKEN (sống DÀI ~7 ngày):
//     - CHỈ dùng cho 1 việc: xin cấp access token mới khi cái cũ hết hạn.
//     - Server LƯU BẢN BĂM của nó trong DB -> có thể THU HỒI bất cứ lúc
//       nào (đăng xuất = xóa hash trong DB là refresh token thành vô dụng).
//       Đây chính là cái JWT đơn thuần không làm được ("stateless" nên
//       không thu hồi được) - giờ ta kết hợp cả hai ưu điểm.
//
// Cả 2 đều nằm trong cookie httpOnly (JS không đọc được - chống XSS).
// Refresh cookie giới hạn path=/api/auth -> trình duyệt CHỈ gửi nó khi
// gọi các route auth, các request khác không kèm -> giảm bề mặt tấn công.
// ============================================================

import jwt from "jsonwebtoken";
import crypto from "crypto";

// Các hằng số thời gian (mili giây) cho maxAge cookie
const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 phút
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 ngày

// Thuộc tính cookie dùng chung - khai báo 1 nơi cho thống nhất
const baseCookie = {
  httpOnly: true, // JS không đọc được -> chống trộm token qua XSS
  sameSite: "strict", // chống CSRF
  secure: process.env.NODE_ENV === "production", // chỉ HTTPS ở production
};

// Ký access token (secret riêng, hạn ngắn)
export const generateAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });

// Ký refresh token (secret KHÁC, hạn dài)
// Dùng 2 secret khác nhau để access token không thể "giả làm" refresh
// token và ngược lại.
//
// BÀI HỌC TỪ BUG THỰC TẾ: JWT chỉ gồm {userId, iat, exp} thì 2 token
// ký trong CÙNG 1 GIÂY sẽ GIỐNG HỆT NHAU (iat/exp tính theo giây)
// -> cơ chế rotation vô dụng vì "token mới" trùng "token cũ".
// Giải pháp: thêm jti (JWT ID) ngẫu nhiên để mỗi token là DUY NHẤT.
export const generateRefreshToken = (userId) =>
  jwt.sign(
    { userId, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

// Băm refresh token để lưu DB (nguyên tắc: DB không bao giờ giữ token gốc)
export const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// TÊN COOKIE TÁCH RIÊNG CHO 2 APP (web bán hàng & khu quản trị).
//
// VẤN ĐỀ THỰC TẾ (chỉ xảy ra khi chạy LOCAL): web bán hàng (cổng 5173)
// và khu quản trị (cổng 5174) tuy KHÁC CỔNG nhưng trình duyệt coi chung
// một site "localhost" -> cookie dùng chung một không gian tên. Khi bạn
// đăng nhập web bán hàng bằng tài khoản thường, cookie "jwt" của admin
// bị GHI ĐÈ -> khu quản trị gọi API liền dính 403 (token không phải admin).
//
// CÁCH KHẮC PHỤC: khu quản trị dùng bộ cookie tên RIÊNG ("ajwt",
// "arefreshJwt"). Mỗi request từ app quản trị gắn header X-Admin-Client
// để backend biết đọc/ghi đúng bộ cookie -> 2 phiên độc lập hoàn toàn,
// đăng nhập app này không đụng app kia.
//
// (Trên production 2 app chạy 2 tên miền khác nhau nên không bao giờ
//  va chạm; cơ chế này chủ yếu để trải nghiệm dev local trơn tru.)
export const cookieNames = (isAdmin) =>
  isAdmin
    ? { access: "ajwt", refresh: "arefreshJwt" }
    : { access: "jwt", refresh: "refreshJwt" };

// Set cả 2 cookie sau khi đăng nhập/đăng ký/refresh thành công
export const setAuthCookies = (res, accessToken, refreshToken, isAdmin = false) => {
  const name = cookieNames(isAdmin);
  res.cookie(name.access, accessToken, { ...baseCookie, maxAge: ACCESS_MAX_AGE });
  res.cookie(name.refresh, refreshToken, {
    ...baseCookie,
    maxAge: REFRESH_MAX_AGE,
    path: "/api/auth", // chỉ gửi kèm khi gọi route /api/auth/*
  });
};

// Xóa cả 2 cookie khi đăng xuất
export const clearAuthCookies = (res, isAdmin = false) => {
  const name = cookieNames(isAdmin);
  res.cookie(name.access, "", { ...baseCookie, maxAge: 0 });
  res.cookie(name.refresh, "", { ...baseCookie, maxAge: 0, path: "/api/auth" });
};
