// ============================================================
// COUPON.MODEL.JS - MODEL MÃ GIẢM GIÁ
// ------------------------------------------------------------
// Bài học bảo mật/nghiệp vụ quan trọng của coupon:
//   1. Mọi kiểm tra (hạn, số lượt, đơn tối thiểu) phải ở SERVER.
//      Client chỉ gửi chuỗi code - không bao giờ gửi số tiền giảm!
//   2. Trừ lượt dùng phải NGUYÊN TỬ (atomic) - nếu không, 2 người
//      dùng mã cuối cùng CÙNG LÚC sẽ đều thành công (race condition,
//      giống bài học oversell tồn kho ở order.controller.js).
// ============================================================

import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    // Mã nhập vào, vd "SINHVIEN200K" - luôn uppercase để không phân
    // biệt hoa thường khi khách gõ
    code: {
      type: String,
      required: [true, "Mã giảm giá là bắt buộc"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [30, "Mã tối đa 30 ký tự"],
    },
    description: { type: String, default: "", maxlength: 200 },
    // 2 kiểu giảm: theo % hoặc số tiền cố định
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    // percent: 1-100 (%) | fixed: số tiền VND
    discountValue: {
      type: Number,
      required: [true, "Giá trị giảm là bắt buộc"],
      min: [0, "Giá trị giảm không được âm"],
    },
    // Với kiểu percent: chặn mức giảm tối đa (vd giảm 40% nhưng tối đa 500k)
    maxDiscount: { type: Number, default: 0 }, // 0 = không giới hạn
    // Giá trị đơn hàng tối thiểu để áp mã
    minOrderValue: { type: Number, default: 0 },
    // Tổng số lượt dùng cho phép + đã dùng bao nhiêu
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: [true, "Ngày hết hạn là bắt buộc"] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ------------------------------------------------------------
// Instance method: tính số tiền giảm cho 1 giá trị đơn hàng.
// Trả về số tiền giảm (đã áp trần maxDiscount nếu có).
// Việc KIỂM TRA hợp lệ (hạn, lượt...) làm ở controller.
// ------------------------------------------------------------
couponSchema.methods.calculateDiscount = function (itemsPrice) {
  let discount = 0;
  if (this.discountType === "percent") {
    discount = Math.round((itemsPrice * this.discountValue) / 100);
    // Áp trần nếu có cấu hình maxDiscount
    if (this.maxDiscount > 0) discount = Math.min(discount, this.maxDiscount);
  } else {
    discount = this.discountValue;
  }
  // Không bao giờ giảm quá giá trị đơn hàng
  return Math.min(discount, itemsPrice);
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
