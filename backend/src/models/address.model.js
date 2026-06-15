// ============================================================
// ADDRESS.MODEL.JS - SỔ ĐỊA CHỈ GIAO HÀNG CỦA NGƯỜI DÙNG
// ------------------------------------------------------------
// Người dùng lưu nhiều địa chỉ (nhà, công ty...) để checkout nhanh,
// giống mọi trang TMĐT thật. Tách collection riêng (không nhúng vào
// User) vì: địa chỉ được thêm/sửa/xóa thường xuyên, query riêng lẻ,
// và giữ document User gọn nhẹ.
//
// CHỐNG IDOR: mọi thao tác đều filter theo user lấy từ TOKEN
// -> không thể sửa/xóa địa chỉ của người khác dù đoán được id.
// ============================================================

import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // query "địa chỉ của tôi" rất thường xuyên
    },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    // Địa chỉ mặc định - tự điền sẵn khi checkout
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Address = mongoose.model("Address", addressSchema);
export default Address;
