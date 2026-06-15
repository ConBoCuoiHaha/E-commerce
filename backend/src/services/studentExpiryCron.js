// ============================================================
// STUDENTEXPIRYCRON.JS - TỰ ĐỘNG GỠ QUYỀN HSSV HẾT HẠN (v10-P3)
// ------------------------------------------------------------
// Theo Google Doc: chạy 00:00 mỗi ngày, quét tài khoản HSSV đã quá
// ngày hết hạn thẻ -> chuyển studentStatus về "expired" + ghi SystemLog.
// Sau đó khi mua hàng, hệ thống tự bỏ ưu đãi HSSV, rơi về hạng VIP/thường
// (logic ở computeMembershipDiscount: chỉ áp HSSV khi isStudentActive()).
//
// Dùng node-cron. Bật/tắt qua env HSSV_CRON_AUTO (mặc định bật).
// ============================================================

import cron from "node-cron";
import User from "../models/user.model.js";
import SystemLog from "../models/systemLog.model.js";

// Hàm quét (tách riêng để test gọi trực tiếp được, không phải chờ 00:00)
export const runStudentExpiryScan = async () => {
  const now = new Date();
  // HSSV đã duyệt nhưng thẻ đã quá hạn
  const expired = await User.find({
    studentStatus: "approved",
    studentCardExpiry: { $lt: now },
  }).select("_id name");

  if (expired.length === 0) return 0;

  const ids = expired.map((u) => u._id);
  await User.updateMany({ _id: { $in: ids } }, { $set: { studentStatus: "expired" } });

  // Ghi log từng tài khoản để kế toán theo dõi
  await SystemLog.insertMany(
    expired.map((u) => ({
      action: "HSSV_EXPIRED",
      description: `Tự động gỡ quyền HSSV của ${u.name} do thẻ hết hạn`,
      user: u._id,
    }))
  );
  console.log(`🎓 Cron HSSV: đã gỡ quyền ${expired.length} tài khoản hết hạn`);
  return expired.length;
};

export const startStudentExpiryCron = () => {
  if (process.env.HSSV_CRON_AUTO === "false") {
    console.log("ℹ️  Cron gỡ quyền HSSV: TẮT (HSSV_CRON_AUTO=false)");
    return;
  }
  // "0 0 * * *" = 00:00 mỗi ngày
  cron.schedule("0 0 * * *", () => {
    runStudentExpiryScan().catch((err) =>
      console.error("⚠️ Lỗi cron HSSV:", err.message)
    );
  });
  console.log("🎓 Cron gỡ quyền HSSV: BẬT (chạy 00:00 hằng ngày)");
};
