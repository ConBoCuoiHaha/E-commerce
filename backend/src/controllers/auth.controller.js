// ============================================================
// AUTH.CONTROLLER.JS - XÁC THỰC NÂNG CAO (Phase 3)
// ------------------------------------------------------------
// Các luồng trong file này:
//   1. signup        : đăng ký + gửi email xác thực
//   2. verifyEmail   : bấm link trong email -> kích hoạt tài khoản
//   3. login         : đăng nhập (username/email) + KHÓA TÀI KHOẢN
//                      tạm thời khi sai mật khẩu nhiều lần
//   4. refresh       : dùng refresh token xin access token mới
//   5. logout        : thu hồi refresh token + xóa cookie
//   6. forgotPassword: gửi email link đặt lại mật khẩu
//   7. resetPassword : đặt mật khẩu mới bằng token trong email
//   8. getMe / updateProfile
//
// CÁC NGUYÊN TẮC BẢO MẬT ÁP DỤNG:
//   - DB chỉ lưu HASH của mọi token (refresh/verify/reset).
//   - Thông báo lỗi chung chung -> chống dò tài khoản (enumeration).
//   - Khóa theo TÀI KHOẢN (không chỉ IP) -> kẻ tấn công đổi IP liên
//     tục vẫn bị chặn.
// ============================================================

import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../utils/generateToken.js";
import { createRandomToken, hashToken } from "../utils/cryptoToken.js";
import { sendVerificationEmail, sendResetPasswordEmail } from "../utils/sendEmail.js";
import { verifyGoogleToken } from "../utils/googleClient.js";

// Ngưỡng khóa tài khoản: sai 5 lần liên tiếp -> khóa 15 phút
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

// Thông tin user an toàn để trả về API (không bao giờ kèm password/hash)
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  avatar: user.avatar,
});

// Nhận diện request đến từ APP QUẢN TRỊ (cổng 5174). App quản trị gắn
// header "X-Admin-Client: 1" trong mọi request -> backend dùng bộ cookie
// RIÊNG (ajwt/arefreshJwt) cho nó, tránh va chạm cookie với web bán hàng
// khi cùng chạy trên localhost. Xem giải thích đầy đủ ở generateToken.js.
const isAdminClient = (req) => req.get("x-admin-client") === "1";

// Hàm phụ: cấp cặp token mới + lưu hash refresh vào DB + set cookie.
// Gom vào 1 chỗ vì signup/login/refresh đều cần đúng trình tự này.
// isAdmin: quyết định set bộ cookie nào (web bán hàng hay khu quản trị).
const issueTokens = async (user, res, isAdmin = false) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  // Lưu HASH refresh token -> sau này thu hồi được (logout xóa hash)
  user.refreshTokenHash = hashRefreshToken(refreshToken);
  await user.save();
  setAuthCookies(res, accessToken, refreshToken, isAdmin);
};

// Hàm phụ: sinh USERNAME duy nhất từ email (cho tài khoản tạo qua Google).
// "hung.nguyen@gmail.com" -> thử "hung_nguyen", trùng thì "hung_nguyen1"...
// Username chỉ gồm chữ thường/số/gạch dưới (khớp ràng buộc model).
const generateUniqueUsername = async (email) => {
  let base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_") // ký tự lạ -> gạch dưới
    .slice(0, 25);
  if (base.length < 3) base = `user_${base}`; // đủ tối thiểu 3 ký tự

  let username = base;
  let i = 0;
  // Lặp tới khi tìm được username chưa ai dùng
  while (await User.exists({ username })) {
    i += 1;
    username = `${base}${i}`;
  }
  return username;
};

// ------------------------------------------------------------
// 1. POST /api/auth/signup - Đăng ký + gửi email xác thực
// ------------------------------------------------------------
export const signup = async (req, res) => {
  const { name, username, email, password } = req.body;

  const existed = await User.findOne({ $or: [{ email }, { username }] });
  if (existed) {
    const field = existed.email === email ? "Email" : "Tên đăng nhập";
    return res.status(400).json({ message: `${field} đã được sử dụng` });
  }

  // Tạo token xác thực email: raw gửi qua mail, hash lưu DB, hạn 24h
  const { raw, hash } = createRandomToken();

  const user = await User.create({
    name,
    username,
    email,
    password,
    emailVerificationToken: hash,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Gửi email xác thực - không chặn response, lỗi email chỉ log
  sendVerificationEmail(user, raw).catch((err) =>
    console.error("⚠️ Gửi email xác thực thất bại:", err.message)
  );

  await issueTokens(user, res, isAdminClient(req));
  res.status(201).json({
    ...publicUser(user),
    message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
  });
};

// ------------------------------------------------------------
// 2. POST /api/auth/verify-email - Xác thực email từ link
// Body: { id, token } (lấy từ query string của link trong email)
// ------------------------------------------------------------
export const verifyEmail = async (req, res) => {
  const { id, token } = req.body;

  // Băm token nhận được rồi so với hash trong DB + kiểm tra còn hạn.
  // $gt: Date.now() -> chỉ khớp khi CHƯA hết hạn.
  const user = await User.findOne({
    _id: id,
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationToken +emailVerificationExpires");

  if (!user) {
    return res
      .status(400)
      .json({ message: "Link xác thực không hợp lệ hoặc đã hết hạn" });
  }

  user.isEmailVerified = true;
  // Xóa token sau khi dùng -> link chỉ dùng được MỘT LẦN
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: "Xác thực email thành công!" });
};

// ------------------------------------------------------------
// 3. POST /api/auth/login - Đăng nhập + chống brute-force theo tài khoản
// ------------------------------------------------------------
export const login = async (req, res) => {
  const { identifier, password } = req.body;

  const id = identifier.toLowerCase();
  const query = id.includes("@") ? { email: id } : { username: id };

  // Lấy kèm các trường ẩn cần cho việc kiểm tra khóa + đếm số lần sai
  const user = await User.findOne(query).select(
    "+password +loginAttempts +lockUntil"
  );

  // --- Kiểm tra tài khoản đang bị khóa? ---
  if (user && user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    // 423 Locked: tài nguyên đang bị khóa
    return res.status(423).json({
      message: `Tài khoản tạm khóa do đăng nhập sai quá nhiều. Thử lại sau ${minutesLeft} phút.`,
    });
  }

  // --- Kiểm tra mật khẩu ---
  if (!user || !(await user.comparePassword(password))) {
    if (user) {
      // Sai mật khẩu -> tăng bộ đếm. Đủ ngưỡng -> đặt thời điểm mở khóa.
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.loginAttempts = 0; // reset đếm cho chu kỳ sau
      }
      await user.save();
    }
    // Thông báo CHUNG CHUNG cho cả "không có tài khoản" lẫn "sai mật khẩu"
    return res.status(401).json({ message: "Tài khoản hoặc mật khẩu không đúng" });
  }

  // --- Đăng nhập thành công -> reset bộ đếm khóa ---
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await issueTokens(user, res, isAdminClient(req)); // (đã gồm user.save())
  res.json(publicUser(user));
};

// ------------------------------------------------------------
// 3b. POST /api/auth/google - Đăng nhập bằng Google (OAuth)
// Body: { credential } - là ID token do Google Identity Services trả về.
//
// LUỒNG XỬ LÝ:
//   1. XÁC MINH token phía server (verifyGoogleToken) - bước an toàn
//      bắt buộc, không bao giờ tin token client gửi mà chưa verify.
//   2. Yêu cầu email ĐÃ ĐƯỢC GOOGLE XÁC MINH (email_verified) - tránh
//      kẻ xấu mượn email người khác chưa xác minh để chiếm tài khoản.
//   3. GHÉP TÀI KHOẢN:
//      - Đã có user trùng googleId -> chính là họ, đăng nhập luôn.
//      - Chưa có googleId nhưng trùng email -> LIÊN KẾT googleId vào
//        tài khoản sẵn có (đăng nhập mật khẩu hay Google đều cùng 1
//        tài khoản). An toàn vì email Google đã xác minh.
//      - Chưa có gì -> TẠO user mới: không mật khẩu, isEmailVerified=true.
//   4. Cấp access + refresh token y hệt đăng nhập thường (cookie httpOnly).
// ------------------------------------------------------------
export const googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: "Thiếu Google credential" });
  }

  // 1. Xác minh token. Sai/giả/hết hạn -> verify ném lỗi -> trả 401.
  let payload;
  try {
    payload = await verifyGoogleToken(credential);
  } catch {
    return res.status(401).json({ message: "Token Google không hợp lệ" });
  }

  const { sub: googleId, email, email_verified, name, picture } = payload;

  // 2. Email phải được Google xác minh
  if (!email || !email_verified) {
    return res
      .status(400)
      .json({ message: "Email Google chưa được xác minh, không thể đăng nhập" });
  }

  // 3a. Đã có tài khoản gắn googleId này -> đăng nhập
  let user = await User.findOne({ googleId });

  // 3b. Chưa có -> thử tìm theo email để LIÊN KẾT vào tài khoản sẵn có
  if (!user) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      user.isEmailVerified = true; // Google đã xác minh email
    }
  }

  // 3c. Vẫn chưa có -> tạo tài khoản MỚI (không mật khẩu)
  if (!user) {
    user = new User({
      name: name || email.split("@")[0],
      username: await generateUniqueUsername(email),
      email: email.toLowerCase(),
      googleId,
      avatar: picture || "",
      isEmailVerified: true,
      // KHÔNG set password -> model cho phép vì có googleId
    });
  }

  // 4. Cấp token (issueTokens đã gồm user.save())
  await issueTokens(user, res, isAdminClient(req));
  res.json(publicUser(user));
};

// ------------------------------------------------------------
// 4. POST /api/auth/refresh - Cấp access token mới bằng refresh token
// Luồng: đọc cookie refreshJwt -> verify chữ ký -> so hash với DB
//        -> cấp CẶP TOKEN MỚI (refresh rotation: mỗi lần refresh, token
//        cũ bị thay -> token bị đánh cắp dùng lại sẽ không khớp hash).
// ------------------------------------------------------------
export const refresh = async (req, res) => {
  // Khu quản trị dùng cookie refresh tên riêng (arefreshJwt) -> đọc đúng
  // theo header nhận diện app, nếu không sẽ refresh nhầm phiên/không thấy.
  const isAdmin = isAdminClient(req);
  const token = isAdmin ? req.cookies.arefreshJwt : req.cookies.refreshJwt;
  if (!token) {
    return res.status(401).json({ message: "Không tìm thấy refresh token" });
  }

  try {
    // Bước 1: verify chữ ký + hạn bằng SECRET RIÊNG của refresh
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Bước 2: so HASH với DB - token hợp lệ về chữ ký nhưng đã bị
    // thu hồi (logout) hoặc đã bị xoay (rotation) thì hash sẽ KHÔNG khớp
    const user = await User.findById(decoded.userId).select("+refreshTokenHash");
    if (!user || user.refreshTokenHash !== hashRefreshToken(token)) {
      return res.status(401).json({ message: "Refresh token đã bị thu hồi" });
    }

    // Bước 3: cấp cặp token MỚI (rotation) - đúng bộ cookie của app
    await issueTokens(user, res, isAdmin);
    res.json({ message: "Đã làm mới phiên đăng nhập" });
  } catch {
    return res.status(401).json({ message: "Refresh token không hợp lệ hoặc hết hạn" });
  }
};

// ------------------------------------------------------------
// 5. POST /api/auth/logout - Thu hồi refresh token + xóa cookie
// ------------------------------------------------------------
export const logout = async (req, res) => {
  const isAdmin = isAdminClient(req);
  // Nếu có refresh token hợp lệ -> xóa hash trong DB (thu hồi thật sự,
  // không chỉ xóa cookie phía trình duyệt). Đọc đúng cookie theo app.
  const token = isAdmin ? req.cookies.arefreshJwt : req.cookies.refreshJwt;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.updateOne(
        { _id: decoded.userId },
        { $unset: { refreshTokenHash: "" } }
      );
    } catch {
      // token rác thì bỏ qua - vẫn xóa cookie bên dưới
    }
  }
  clearAuthCookies(res, isAdmin);
  res.json({ message: "Đăng xuất thành công" });
};

// ------------------------------------------------------------
// 6. POST /api/auth/forgot-password - Gửi email đặt lại mật khẩu
// ------------------------------------------------------------
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  // QUAN TRỌNG: dù email TỒN TẠI hay KHÔNG, đều trả về CÙNG MỘT thông
  // báo -> kẻ xấu không dò được email nào có tài khoản (enumeration).
  const genericMessage =
    "Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi.";

  if (user) {
    const { raw, hash } = createRandomToken();
    user.passwordResetToken = hash;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await user.save();

    sendResetPasswordEmail(user, raw).catch((err) =>
      console.error("⚠️ Gửi email reset thất bại:", err.message)
    );
  }

  res.json({ message: genericMessage });
};

// ------------------------------------------------------------
// 7. POST /api/auth/reset-password - Đặt mật khẩu mới từ link email
// Body: { id, token, password }
// ------------------------------------------------------------
export const resetPassword = async (req, res) => {
  const { id, token, password } = req.body;

  const user = await User.findOne({
    _id: id,
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    return res
      .status(400)
      .json({ message: "Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" });
  }

  user.password = password; // pre-save hook tự băm
  // Token dùng 1 lần -> xóa ngay
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Mở khóa tài khoản (nếu đang bị khóa do brute-force)
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  // THU HỒI refresh token cũ: nếu kẻ xấu đang giữ phiên đăng nhập,
  // đổi mật khẩu xong phiên đó cũng bị đá ra.
  user.refreshTokenHash = undefined;
  await user.save();

  res.json({ message: "Đặt lại mật khẩu thành công! Hãy đăng nhập bằng mật khẩu mới." });
};

// ------------------------------------------------------------
// 8. GET /api/auth/me + PUT /api/auth/profile
// ------------------------------------------------------------
export const getMe = (req, res) => {
  res.json(publicUser(req.user));
};

export const updateProfile = async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (name) user.name = name;
  if (password) user.password = password;

  const updated = await user.save();
  res.json(publicUser(updated));
};
