// ============================================================
// AUTH.MIDDLEWARE.JS - MIDDLEWARE XÁC THỰC & PHÂN QUYỀN
// ------------------------------------------------------------
// 2 khái niệm bảo mật cốt lõi, đừng nhầm lẫn:
//   - AUTHENTICATION (xác thực): "Bạn là AI?"   -> protectRoute
//   - AUTHORIZATION  (phân quyền): "Bạn được làm GÌ?" -> requireAdmin
//
// Luồng hoạt động của protectRoute:
//   1. Lấy token JWT từ cookie httpOnly tên là "jwt"
//   2. Verify chữ ký token bằng JWT_SECRET
//      - Token giả mạo / hết hạn -> verify ném lỗi -> trả 401
//   3. Lấy userId từ payload, tìm user trong DB
//   4. Gắn user vào req.user -> các controller phía sau dùng được
//
// TẠI SAO LƯU JWT TRONG COOKIE HTTPONLY MÀ KHÔNG PHẢI localStorage?
//   - localStorage có thể bị đọc bởi JavaScript -> nếu web dính lỗ
//     hổng XSS (kẻ xấu chèn được script), token sẽ bị đánh cắp.
//   - Cookie httpOnly thì JavaScript KHÔNG đọc được, trình duyệt
//     tự động đính kèm vào mỗi request -> an toàn hơn trước XSS.
// ============================================================

import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    // 1. Lấy token từ cookie (cookie-parser đã parse sẵn vào req.cookies).
    //    App QUẢN TRỊ (cổng 5174) gắn header "X-Admin-Client: 1" và dùng
    //    cookie tên RIÊNG ("ajwt") để không bị web bán hàng ghi đè token
    //    khi cùng chạy localhost. Đọc đúng cookie theo header nhận diện.
    const token =
      req.get("x-admin-client") === "1" ? req.cookies.ajwt : req.cookies.jwt;

    if (!token) {
      // 401 Unauthorized: chưa đăng nhập / không có thông tin xác thực
      return res
        .status(401)
        .json({ message: "Chưa đăng nhập - không tìm thấy token" });
    }

    // 2. Verify token:
    //    - Kiểm tra chữ ký có đúng được ký bằng JWT_SECRET của ta không
    //      (token bị sửa 1 ký tự cũng sẽ sai chữ ký)
    //    - Kiểm tra token còn hạn không (trường exp)
    //    Nếu sai -> jwt.verify NÉM LỖI -> nhảy xuống catch
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 3. Tìm user theo id trong payload.
    //    Tại sao phải query DB thay vì tin luôn payload?
    //    -> Vì user có thể đã bị xóa/khóa SAU khi token được cấp.
    //    .select("-password"): loại trường password cho chắc
    //    (model đã select:false nhưng đây là lớp phòng thủ thứ 2 -
    //     nguyên tắc "defense in depth": nhiều lớp bảo vệ chồng nhau)
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Người dùng không tồn tại" });
    }

    // 4. Gắn user vào request để controller phía sau dùng:
    //    vd: req.user._id, req.user.role ...
    req.user = user;
    next(); // cho request đi tiếp tới middleware/controller kế tiếp
  } catch (error) {
    // jwt.verify ném 2 loại lỗi phổ biến:
    // - TokenExpiredError: token hết hạn
    // - JsonWebTokenError: token sai/giả mạo
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" });
    }
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// ------------------------------------------------------------
// requireAdmin: PHẢI dùng SAU protectRoute (vì cần req.user có sẵn).
// Cách dùng trong route:
//   router.post("/", protectRoute, requireAdmin, createProduct)
//
// LƯU Ý BẢO MẬT: phân quyền phải kiểm tra ở BACKEND như thế này.
// Việc frontend ẩn nút "Quản trị" chỉ là trang trí - kẻ xấu có thể
// gọi thẳng API bằng Postman/curl mà không cần qua giao diện!
// ------------------------------------------------------------
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  // 403 Forbidden: đã đăng nhập (biết là ai) nhưng KHÔNG đủ quyền.
  // Phân biệt với 401: chưa biết là ai.
  return res
    .status(403)
    .json({ message: "Bạn không có quyền thực hiện hành động này" });
};
