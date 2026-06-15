// ============================================================
// WISHLIST.MODEL.JS - YÊU THÍCH (collection RIÊNG)
// ------------------------------------------------------------
// Refactor từ mảng `wishlist` nhúng trong User sang collection riêng
// (giống repo mern-ecommerce). Mỗi document = 1 lượt "thích":
//   { user, product, createdAt }
// Ưu điểm so với mảng nhúng:
//   - Biết ĐƯỢC THÍCH LÚC NÀO (createdAt) -> sắp xếp "thích gần đây"
//   - Đếm "sản phẩm X được bao nhiêu người thích" bằng 1 countDocuments
//   - User document không phình to
// ============================================================

import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true }
);

// Mỗi (user, product) chỉ thích 1 lần - ràng buộc tầng DB,
// thay cho vai trò $addToSet ở thiết kế mảng cũ.
wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;
