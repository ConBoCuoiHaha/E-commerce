// ============================================================
// CATEGORY.MODEL.JS - MODEL DANH MỤC (web HungSaiGon)
// ------------------------------------------------------------
// Danh mục: Laptop, Bàn phím, Chuột, Màn hình, RAM, Ổ cứng SSD.
// Thêm `icon` và `order` để hiển thị menu đẹp và đúng thứ tự.
// ============================================================

import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên danh mục là bắt buộc"],
      unique: true,
      trim: true,
      maxlength: [50, "Tên danh mục tối đa 50 ký tự"],
    },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, default: "", maxlength: 500 },
    // Emoji/icon hiển thị cạnh tên danh mục trên menu
    icon: { type: String, default: "" },
    // Thứ tự sắp xếp trong menu (số nhỏ hiện trước)
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
