// ============================================================
// SYSTEMLOG.MODEL.JS - NHẬT KÝ HỆ THỐNG (audit trail)
// ------------------------------------------------------------
// Ghi lại các sự kiện nghiệp vụ quan trọng để kế toán/quản trị truy
// vết: nhập lô hàng, xuất kho tính giá vốn, cron gỡ quyền HSSV
// (Phase 3), trích lập dự phòng (Phase 4)...
// Đây là "sổ tay đen" của hệ thống - chỉ ghi, không sửa.
// ============================================================

import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema(
  {
    // Mã hành động để lọc nhanh: BATCH_IMPORT, STOCK_OUT_FIFO,
    // HSSV_EXPIRED, INVENTORY_PROVISION...
    action: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    // Liên kết (tùy chọn) tới đối tượng liên quan
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    refId: { type: mongoose.Schema.Types.ObjectId }, // id đơn/lô/sản phẩm...
    // Dữ liệu thêm dạng tự do (vd { cogs, quantity })
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const SystemLog = mongoose.model("SystemLog", systemLogSchema);
export default SystemLog;
