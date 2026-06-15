// ============================================================
// ACCOUNTINGSETTING.MODEL.JS - CẤU HÌNH KẾ TOÁN (SINGLETON)
// ------------------------------------------------------------
// Lưu MỌI tham số tài chính của hệ thống kế toán - kho hàng để admin
// chỉnh qua giao diện (không hardcode trong code). Pattern singleton:
// chỉ 1 document, key cố định = "accounting".
//
// Các nhóm tham số (theo Google Doc nghiệp vụ của chủ shop):
//   1. Định giá động: FC, chi phí đóng gói, các tỷ lệ % cấu thành giá
//   2. Theo danh mục: tỷ lệ chi phí lưu kho/năm (h) + tỷ lệ sụt giá
//      công nghệ 3 năm (declining balance) - dùng cho Ceff, tuổi kho, LCNRV
//   3. Ngưỡng hạng VIP + tỷ lệ giá vốn mở sổ (opening balance)
// (Ma trận chiết khấu HSSV/VIP sẽ thêm ở Phase 3.)
// ============================================================

import mongoose from "mongoose";

// Cấu hình theo TỪNG DANH MỤC (khớp slug Category của shop)
const categoryConfigSchema = new mongoose.Schema(
  {
    categorySlug: { type: String, required: true }, // vd "laptop", "ram"
    label: { type: String, default: "" }, // tên hiển thị
    // h: tỷ lệ chi phí lưu kho vận hành / năm (%). Ceff = C0 × (1 + h×t)
    carryingRatePct: { type: Number, required: true },
    // Tỷ lệ sụt giá công nghệ theo năm 1/2/3 (%/năm, declining balance)
    depreciationPct: { type: [Number], default: [10, 10, 10] },
  },
  { _id: false }
);

const accountingSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "accounting", unique: true },

    // --- 1. Định giá động (công thức P* - dùng ở Phase 4) ---
    fixedCostMonthly: { type: Number, default: 50000000 }, // FC: lương + mặt bằng
    packagingCost: { type: Number, default: 30000 }, // PE: đóng gói/sp
    marketingRatePct: { type: Number, default: 5 }, // %M
    gatewayFeePct: { type: Number, default: 2 }, // %Gt (cổng thanh toán/COD)
    riskProvisionPct: { type: Number, default: 3 }, // %Rp (dự phòng lưu kho)
    netProfitPct: { type: Number, default: 15 }, // %Ln (lợi nhuận ròng)

    // --- 2. Cấu hình theo danh mục ---
    categoryConfigs: { type: [categoryConfigSchema], default: [] },
    // Dùng khi sản phẩm thuộc danh mục chưa cấu hình riêng
    defaultCarryingRatePct: { type: Number, default: 12 },
    defaultDepreciationPct: { type: [Number], default: [15, 15, 15] },

    // --- 2b. MA TRẬN CHIẾT KHẤU MEMBERSHIP (v10-P3) ---
    // Mỗi danh mục có 3 mức ưu đãi (HSSV / VIP Bạc S-MEM / VIP Vàng
    // S-VIP), mỗi mức gồm % giảm + CAP (mức giảm tối đa tính bằng đồng)
    // để chống lạm dụng. Khi thanh toán, hệ thống áp mức CÓ LỢI NHẤT
    // cho khách giữa HSSV (nếu thẻ còn hiệu lực) và hạng VIP hiện tại.
    discountMatrix: {
      type: [
        {
          categorySlug: String,
          label: String,
          student: { percent: Number, cap: Number },
          mem: { percent: Number, cap: Number },
          vip: { percent: Number, cap: Number },
        },
      ],
      default: [],
    },

    // --- 3. Hạng VIP + giá vốn mở sổ ---
    vipMemThreshold: { type: Number, default: 15000000 }, // S-MEM
    vipVipThreshold: { type: Number, default: 50000000 }, // S-VIP
    // Tỷ lệ ước tính GIÁ VỐN so với giá bán cho lô "mở sổ" (opening
    // balance) của hàng tồn sẵn có trước khi dùng hệ thống nhập lô.
    // 0.75 = giả định giá nhập bằng 75% giá bán (biên gộp ~25%, khớp
    // ví dụ trong tài liệu: laptop bán 20tr / vốn 15tr).
    openingCostRatio: { type: Number, default: 0.75 },
  },
  { timestamps: true }
);

const AccountingSetting = mongoose.model("AccountingSetting", accountingSettingSchema);
export default AccountingSetting;
