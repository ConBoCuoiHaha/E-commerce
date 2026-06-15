// ============================================================
// BANNER.MODEL.JS - MODEL BANNER QUẢNG CÁO TRANG CHỦ
// ------------------------------------------------------------
// Admin quản lý các slide banner ở hero trang chủ (như thinkpro
// đổi banner khuyến mãi theo tháng) - không phải sửa code mỗi lần
// đổi chương trình khuyến mãi. Đây là pattern CMS thu nhỏ.
// ============================================================

import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề banner là bắt buộc"],
      trim: true,
      maxlength: [120, "Tiêu đề tối đa 120 ký tự"],
    },
    subtitle: { type: String, default: "", maxlength: 200 },
    // Ảnh nền banner (URL). Nếu trống, frontend vẽ banner trang trí mặc định.
    image: { type: String, default: "" },
    // Bấm vào banner thì đi đâu (vd /products?category=laptop)
    link: { type: String, default: "/products" },
    // Nhãn nút CTA trên banner
    buttonLabel: { type: String, default: "Xem ngay", maxlength: 40 },
    // Thứ tự hiển thị (nhỏ trước) + bật/tắt
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", bannerSchema);
export default Banner;
