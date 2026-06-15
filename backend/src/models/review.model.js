// ============================================================
// REVIEW.MODEL.JS - ĐÁNH GIÁ SẢN PHẨM (collection RIÊNG)
// ------------------------------------------------------------
// BÀI HỌC REFACTOR: EMBED -> REFERENCE
// Trước đây review NHÚNG trong Product (mảng sub-document):
//   + Ưu: 1 query lấy đủ trang chi tiết.
//   - Nhược: sản phẩm nhiều review làm document phình to (trần 16MB),
//     KHÔNG phân trang review được, mọi lần thêm review phải save
//     nguyên document Product.
// Tách collection riêng (như mern-ecommerce repo và các web thật):
//   + Phân trang/sắp xếp review độc lập.
//   + Product chỉ giữ 2 số liệu tổng hợp: rating trung bình + numReviews
//     (denormalize - tính lại bằng aggregation mỗi khi có review mới).
// ============================================================

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true, // query "review của sản phẩm X" rất thường xuyên
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Snapshot tên người đánh giá (hiển thị không cần populate User)
    name: { type: String, required: true },
    rating: {
      type: Number,
      required: true,
      min: [1, "Điểm thấp nhất là 1"],
      max: [5, "Điểm cao nhất là 5"],
    },
    comment: {
      type: String,
      required: true,
      maxlength: [1000, "Bình luận tối đa 1000 ký tự"],
    },
  },
  { timestamps: true }
);

// COMPOUND UNIQUE INDEX: mỗi (user, product) chỉ có 1 review.
// Ràng buộc ở TẦNG DATABASE - dù code controller có lỗi/race condition,
// MongoDB vẫn từ chối bản ghi trùng (lỗi 11000). Defense in depth!
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
