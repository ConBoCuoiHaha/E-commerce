// ============================================================
// PAGE.MODEL.JS - BÀI VIẾT TĨNH (mục "Thông tin hữu ích")
// ------------------------------------------------------------
// Chuyển nội dung chính sách (bảo hành, đổi trả...) từ HARDCODE
// trong frontend sang DB -> admin sửa được nội dung bất cứ lúc nào
// mà không cần deploy lại code. Đây là CMS thu nhỏ.
//
// Định dạng `content`: văn bản thuần với quy ước nhẹ:
//   - Dòng bắt đầu "### " -> tiêu đề mục
//   - Dòng bắt đầu "- "   -> gạch đầu dòng
//   - Còn lại            -> đoạn văn
// Frontend có hàm render tương ứng. (Không dùng HTML thô từ admin
// -> tránh hẳn rủi ro XSS qua nội dung bài viết.)
// ============================================================

import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug là bắt buộc"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Tiêu đề là bắt buộc"],
      trim: true,
      maxlength: [150, "Tiêu đề tối đa 150 ký tự"],
    },
    content: {
      type: String,
      required: [true, "Nội dung là bắt buộc"],
      maxlength: [20000, "Nội dung tối đa 20000 ký tự"],
    },
    // Thứ tự hiển thị trong footer/menu
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Page = mongoose.model("Page", pageSchema);
export default Page;
