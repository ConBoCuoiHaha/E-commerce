// ============================================================
// CART.MODEL.JS - GIỎ HÀNG SERVER-SIDE
// ------------------------------------------------------------
// TẠI SAO CHUYỂN GIỎ HÀNG TỪ localStorage LÊN SERVER?
//   - localStorage chỉ sống trong 1 trình duyệt: đổi máy/xóa cache
//     là mất giỏ. Web thật (đã đăng nhập) phải đồng bộ đa thiết bị.
//   - Server giữ giỏ -> các chiến dịch thực tế (nhắc giỏ bỏ quên qua
//     email) mới làm được.
//
// THIẾT KẾ:
//   - Mỗi user có ĐÚNG 1 giỏ (unique index trên user).
//   - Item chỉ lưu THAM CHIẾU (productId + variantId + quantity),
//     KHÔNG lưu giá/tên. Khi đọc giỏ, server populate thông tin MỚI
//     NHẤT từ Product -> giá hiển thị luôn đúng giá hiện tại, sản
//     phẩm đã ẩn thì tự loại khỏi giỏ.
//   - Khách CHƯA đăng nhập vẫn dùng localStorage; khi đăng nhập,
//     frontend gọi /api/cart/merge để TRỘN giỏ local vào giỏ server.
// ============================================================

import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // null nếu sản phẩm không có biến thể
    variantId: { type: mongoose.Schema.Types.ObjectId },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Số lượng tối thiểu 1"],
      max: [100, "Số lượng tối đa 100"],
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 user = 1 giỏ duy nhất
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
