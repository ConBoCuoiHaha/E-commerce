// ============================================================
// SUPPLIER.MODEL.JS - NHÀ CUNG CẤP (Mongo hóa từ schema SQL của tài liệu)
// ------------------------------------------------------------
// Quản lý nguồn nhập hàng. CÔNG NỢ với từng NCC KHÔNG lưu cứng ở đây
// mà TÍNH ĐỘNG từ các lô nhập chưa thanh toán (PurchaseBatch) -> luôn
// chính xác, không sợ lệch khi quên cập nhật.
// ============================================================

import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên nhà cung cấp là bắt buộc"],
      trim: true,
      maxlength: [255, "Tên tối đa 255 ký tự"],
    },
    contactName: { type: String, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      trim: true,
      maxlength: 20,
    },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true, maxlength: 500 },
    taxCode: { type: String, trim: true, maxlength: 50 }, // mã số thuế
    // Điều khoản thanh toán: COD (trả ngay), NET30 (nợ 30 ngày)...
    paymentTerms: {
      type: String,
      enum: ["COD", "NET30", "NET60"],
      default: "COD",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
