// ============================================================
// ORDER.MODEL.JS - MODEL ĐƠN HÀNG (web HungSaiGon)
// ------------------------------------------------------------
// Nguyên tắc "SNAPSHOT": chụp lại thông tin sản phẩm + BIẾN THỂ tại
// thời điểm đặt. Sau này admin đổi giá/đổi tên thì đơn cũ vẫn đúng.
//
// Khác bản trước: mỗi orderItem lưu thêm thông tin BIẾN THỂ đã chọn
// (variantId, variantName) vì giá phụ thuộc biến thể.
// ============================================================

import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

  // --- Snapshot tại thời điểm đặt hàng ---
  name: { type: String, required: true },
  image: { type: String, required: true },
  // Biến thể đã chọn (nếu sản phẩm có biến thể)
  variantId: { type: mongoose.Schema.Types.ObjectId },
  variantName: { type: String },
  // GIÁ do SERVER lấy từ DB theo biến thể - KHÔNG tin giá client gửi
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  // GIÁ VỐN (v10-P2): tính khi XUẤT KHO bằng FIFO. fifoLayers lưu các
  // lô đã trừ (để hoàn lại nếu hủy đơn sau khi xuất).
  costC0: { type: Number, default: 0 }, // giá vốn gốc
  costCeff: { type: Number, default: 0 }, // giá vốn hiệu dụng (gồm chi phí lưu kho)
  fifoLayers: { type: mongoose.Schema.Types.Mixed },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Đơn hàng phải có ít nhất 1 sản phẩm",
      },
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
    },
    paymentMethod: { type: String, enum: ["cod", "banking"], default: "cod" },

    // --- Trạng thái THANH TOÁN (tách riêng trạng thái GIAO HÀNG) ---
    // COD: isPaid = true khi giao thành công (khách trả tiền lúc nhận).
    // Banking: isPaid = true khi đối soát được tiền vào tài khoản
    //          (tự động qua email ngân hàng hoặc admin xác nhận tay).
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    // Mã thanh toán cho đơn chuyển khoản: "HSG" + 6 chữ số ngẫu nhiên.
    // Khách PHẢI ghi mã này vào nội dung chuyển khoản -> hệ thống đọc
    // email báo có của ngân hàng, tìm mã này để đối soát tự động.
    paymentCode: { type: String, index: true },

    // --- Tiền: SERVER tự tính, không nhận từ client ---
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    // Mã giảm giá đã áp (snapshot) + số tiền được giảm
    couponCode: { type: String },
    discountPrice: { type: Number, default: 0 },
    // Chiết khấu MEMBERSHIP (HSSV/VIP) tự áp theo hạng (v10-P3)
    membershipDiscount: { type: Number, default: 0 },
    membershipTier: { type: String, default: "" }, // nhãn mô tả mức đã áp
    totalPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "shipping", "delivered", "cancelled"],
      default: "pending",
    },
    deliveredAt: { type: Date },
    // GIÁ VỐN HÀNG BÁN cả đơn (v10-P2) - kết chuyển khi xuất kho (shipping).
    // cogsCeff dùng cho báo cáo lợi nhuận gộp thật + vòng quay kho.
    cogsC0: { type: Number, default: 0 },
    cogsCeff: { type: Number, default: 0 },
    costedAt: { type: Date }, // thời điểm đã tính giá vốn (tránh tính 2 lần)
    // Thời điểm đã gửi hóa đơn PDF cho khách (v9) - admin biết đơn nào
    // đã xuất hóa đơn, tránh gửi trùng
    invoiceSentAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
