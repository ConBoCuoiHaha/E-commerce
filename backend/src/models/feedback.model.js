// ============================================================
// FEEDBACK.MODEL.JS - MODEL PHẢN HỒI / GÓP Ý (form ở footer)
// ------------------------------------------------------------
// Khách (kể cả chưa đăng nhập) gửi góp ý qua nút "Gửi phản hồi".
// Admin xem danh sách trong dashboard và đánh dấu đã xử lý.
//
// BẢO MẬT: route gửi feedback là PUBLIC -> bắt buộc phải có:
//   - Zod validate độ dài (chặn spam payload khổng lồ)
//   - Rate limit riêng (chặn bot gửi hàng loạt)
// ============================================================

import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên là bắt buộc"],
      trim: true,
      maxlength: [100, "Tên tối đa 100 ký tự"],
    },
    email: {
      type: String,
      required: [true, "Email là bắt buộc"],
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      required: [true, "Nội dung góp ý là bắt buộc"],
      maxlength: [2000, "Nội dung tối đa 2000 ký tự"],
    },
    // Nếu người gửi đang đăng nhập thì gắn kèm (không bắt buộc)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Admin đánh dấu đã xử lý
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
