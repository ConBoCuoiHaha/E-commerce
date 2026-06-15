// ============================================================
// USER.MODEL.JS - MODEL NGƯỜI DÙNG (web HungSaiGon)
// ------------------------------------------------------------
// So với bản trước, model này thêm:
//   - username: tên đăng nhập riêng (login được bằng username HOẶC email)
//   - wishlist: danh sách sản phẩm yêu thích (mảng ref tới Product)
//   - isEmailVerified + emailVerificationToken: phục vụ xác thực email (Phase 3)
//   - passwordResetToken + passwordResetExpires: phục vụ quên mật khẩu (Phase 3)
//   - loginAttempts + lockUntil: khóa tài khoản tạm thời khi đăng nhập sai nhiều (Phase 3)
//
// Các trường Phase 3 được khai báo SẴN từ bây giờ để model ổn định,
// nhưng logic dùng tới chúng sẽ viết ở Phase 3.
//
// Bài học bảo mật cốt lõi vẫn giữ nguyên:
//   - KHÔNG lưu mật khẩu plain text -> băm bằng bcrypt
//   - password có select:false -> không lọt ra API
// ============================================================

import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên là bắt buộc"],
      trim: true,
      maxlength: [50, "Tên tối đa 50 ký tự"],
    },
    // Tên đăng nhập: dùng để login thay cho/đi kèm email.
    // lowercase để "SieuNhan" và "sieunhan" là một -> tránh trùng do hoa thường.
    username: {
      type: String,
      required: [true, "Tên đăng nhập là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Tên đăng nhập tối thiểu 3 ký tự"],
      maxlength: [30, "Tên đăng nhập tối đa 30 ký tự"],
    },
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // BÀI HỌC (Google OAuth): mật khẩu CHỈ bắt buộc với tài khoản
      // đăng ký THƯỜNG. Tài khoản đăng nhập bằng Google không có mật
      // khẩu (Google lo xác thực) -> required là một HÀM: chỉ bắt buộc
      // khi user KHÔNG có googleId.
      required: [
        function () {
          return !this.googleId;
        },
        "Mật khẩu là bắt buộc",
      ],
      minlength: [6, "Mật khẩu tối thiểu 6 ký tự"],
      select: false, // không trả ra khi query thường
    },
    // --- Đăng nhập bằng Google (OAuth) ---
    // Lưu "sub" (subject) - id duy nhất Google cấp cho user. Dùng để
    // nhận diện đúng người dùng Google ở các lần đăng nhập sau, kể cả
    // nếu họ đổi tên hiển thị. sparse: cho phép NHIỀU document không có
    // googleId (tài khoản thường) mà vẫn giữ unique cho những cái có.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Ảnh đại diện lấy từ Google (nếu có) - chỉ để hiển thị
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // LƯU Ý (refactor v4): wishlist KHÔNG còn là mảng nhúng ở đây -
    // đã tách sang collection riêng (wishlist.model.js).

    // --- Xác thực email (dùng ở Phase 3) ---
    // true sau khi người dùng bấm link kích hoạt trong email.
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Lưu BĂM của token xác thực (không lưu token gốc) - nếu DB bị lộ,
    // kẻ xấu cũng không dùng được token. Gửi token gốc qua email.
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // --- Quên mật khẩu (dùng ở Phase 3) ---
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // --- Khóa tài khoản chống brute-force (dùng ở Phase 3) ---
    // Đếm số lần đăng nhập sai liên tiếp; vượt ngưỡng thì đặt lockUntil
    // = thời điểm tài khoản được mở khóa lại.
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    // --- Refresh token (Phase 3) ---
    // Lưu BẢN BĂM SHA-256 của refresh token đang hiệu lực.
    // Đăng xuất -> xóa hash -> refresh token cũ thành vô dụng (thu hồi được).
    refreshTokenHash: { type: String, select: false },

    // ============ MEMBERSHIP (v10-P3) ============
    // --- Học sinh - sinh viên (HSSV) ---
    // Quy trình: khách upload ảnh thẻ -> pending; kế toán duyệt + nhập
    // ngày hết hạn -> approved; cron 00:00 quá hạn -> expired.
    studentStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "expired"],
      default: "none",
    },
    studentCardImage: { type: String, default: "" }, // URL ảnh thẻ (/api/images/..)
    studentCardExpiry: { type: Date }, // ngày hết hạn thẻ (kế toán nhập)
    studentVerifiedAt: { type: Date },
    studentRejectReason: { type: String, default: "" },

    // --- VIP theo tích lũy chi tiêu ---
    // accumulatedSpending cộng dồn khi đơn GIAO THÀNH CÔNG; vipTier
    // tự nâng hạng theo ngưỡng trong AccountingSetting.
    accumulatedSpending: { type: Number, default: 0 },
    vipTier: {
      type: String,
      enum: ["S-NEW", "S-MEM", "S-VIP"],
      default: "S-NEW",
    },
  },
  { timestamps: true }
);

// Băm mật khẩu trước khi lưu (chỉ khi password thay đổi)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// So sánh mật khẩu nhập vào với hash trong DB.
// Tài khoản Google KHÔNG có mật khẩu -> this.password = undefined.
// Phải chặn sớm, nếu không bcrypt.compare(x, undefined) sẽ NÉM LỖI.
// Trả false = "không thể đăng nhập bằng mật khẩu" (đúng nghiệp vụ:
// tài khoản Google muốn đặt mật khẩu thì dùng luồng Quên mật khẩu).
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

// Tiện ích kiểm tra tài khoản có đang bị khóa không (dùng ở Phase 3)
userSchema.methods.isLocked = function () {
  // lockUntil tồn tại VÀ còn ở tương lai -> đang khóa
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// HSSV CÓ HIỆU LỰC: đã duyệt VÀ thẻ chưa hết hạn (v10-P3).
// Dùng khi tính chiết khấu để chắc chắn không áp ưu đãi cho thẻ hết hạn
// (phòng trường hợp cron chưa kịp quét).
userSchema.methods.isStudentActive = function () {
  return (
    this.studentStatus === "approved" &&
    this.studentCardExpiry &&
    this.studentCardExpiry > new Date()
  );
};

const User = mongoose.model("User", userSchema);
export default User;
