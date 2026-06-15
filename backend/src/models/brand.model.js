// ============================================================
// BRAND.MODEL.JS - MODEL THƯƠNG HIỆU (Lenovo, Dell, Apple...)
// ------------------------------------------------------------
// Trước đây brand chỉ là CHUỖI trong product.attributes (đủ để lọc).
// Tách thành collection riêng để giống hệ thống thật:
//   - Admin quản lý danh sách hãng tập trung (thêm logo, mô tả)
//   - Trang chủ/menu hiển thị logo hãng
//   - Khi tạo sản phẩm, admin CHỌN hãng từ danh sách thay vì gõ tay
//     (gõ tay dễ sai chính tả: "Lenovo" / "lenovo" / "LENOVO" thành 3 hãng!)
//
// LƯU Ý THIẾT KẾ: product.attributes.brand vẫn lưu TÊN hãng (string)
// để bộ lọc faceted hoạt động nhanh, không cần $lookup mỗi lần lọc.
// Collection Brand đóng vai trò "danh mục chuẩn" (master data).
// ============================================================

import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên thương hiệu là bắt buộc"],
      unique: true,
      trim: true,
      maxlength: [50, "Tên thương hiệu tối đa 50 ký tự"],
    },
    slug: { type: String, unique: true, lowercase: true },
    // URL logo hãng (hiển thị ở menu, trang lọc)
    logo: { type: String, default: "" },
    description: { type: String, default: "", maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
