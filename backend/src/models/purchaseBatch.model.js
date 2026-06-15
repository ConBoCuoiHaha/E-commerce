// ============================================================
// PURCHASEBATCH.MODEL.JS - LÔ HÀNG NHẬP (cốt lõi tính giá vốn FIFO)
// ------------------------------------------------------------
// Mỗi lần nhập hàng từ NCC = 1 lô (batch), gồm nhiều dòng sản phẩm.
// Mỗi dòng (batchItem) giữ:
//   - importPrice (C0): giá nhập GỐC của lô này -> cơ sở tính Ceff
//   - quantityImported: số nhập ban đầu
//   - quantityInstock: số CÒN LẠI trong lô -> cốt lõi của FIFO
//     (xuất kho trừ lô CŨ NHẤT trước; lô hết -> quantityInstock = 0)
//   - importDate kế thừa từ lô -> tính t (số năm lưu kho) cho Ceff
//
// Vì 1 sản phẩm có thể nhập nhiều lô giá khác nhau, FIFO đảm bảo giá
// vốn hàng bán phản ánh đúng lô được xuất, không bình quân nhòe.
// ============================================================

import mongoose from "mongoose";

const batchItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  // Biến thể cụ thể (sản phẩm có nhiều cấu hình giá/kho riêng)
  variantId: { type: mongoose.Schema.Types.ObjectId },
  sku: { type: String, required: true, trim: true },
  quantityImported: { type: Number, required: true, min: 1 },
  quantityInstock: { type: Number, required: true, min: 0 }, // còn lại (FIFO)
  importPrice: { type: Number, required: true, min: 0 }, // C0 (giá nhập gốc/đơn vị)
  vatRatePct: { type: Number, default: 10 }, // VAT đầu vào %
});

const purchaseBatchSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    // Ngày nhập = mốc tính tuổi kho t cho mọi item trong lô
    importDate: { type: Date, default: Date.now, index: true },
    items: { type: [batchItemSchema], default: [] },
    // Tổng tiền lô (đã gồm VAT) - server tự tính từ items, không tin client
    totalAmount: { type: Number, required: true, min: 0 },
    // Đã trả bao nhiêu cho NCC -> công nợ = totalAmount - amountPaid
    amountPaid: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["PAID", "PARTIALLY_PAID", "UNPAID"],
      default: "UNPAID",
    },
    note: { type: String, default: "", maxlength: 500 },
    // Đánh dấu lô "mở sổ" (sinh tự động cho tồn kho có sẵn lúc bật hệ thống)
    isOpeningBalance: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PurchaseBatch = mongoose.model("PurchaseBatch", purchaseBatchSchema);
export default PurchaseBatch;
