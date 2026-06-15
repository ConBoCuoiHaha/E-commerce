// ============================================================
// PRICING.JS - ĐỊNH GIÁ ĐỘNG + GIÁ TRỊ THUẦN (NRV) (v10-P4)
// ------------------------------------------------------------
// CÔNG THỨC ĐỊNH GIÁ NIÊM YẾT TỐI ƯU (theo Google Doc, đã kiểm chứng
// ra đúng 10.707.000đ):
//
//   P* = (C0 + FC/N + PE) / (1 − %M − %Gt − %Rp − %Ln)
//
//   C0 = giá nhập gốc 1 đơn vị
//   FC = chi phí cố định/tháng (lương + mặt bằng)
//   N  = doanh số mục tiêu/tháng
//   PE = chi phí đóng gói/sp
//   %M/%Gt/%Rp/%Ln = marketing / cổng thanh toán / dự phòng rủi ro /
//                     lợi nhuận ròng kỳ vọng
// Ý nghĩa mẫu số: phần trăm doanh thu BỊ "ăn" bởi chi phí bán hàng +
// lợi nhuận -> chia để "gross-up" giá sao cho sau khi trừ hết vẫn đạt
// đúng biên lợi nhuận ròng mong muốn.
// ============================================================

// Tính P* từ các tham số. Trả về { price, breakdown } (price làm tròn
// tới nghìn đồng cho đẹp niêm yết).
export const computeOptimalPrice = ({ c0, fc, n, pe, mPct, gtPct, rpPct, lnPct }) => {
  const numerator = c0 + fc / n + pe;
  const denom = 1 - (mPct + gtPct + rpPct + lnPct) / 100;
  if (denom <= 0) {
    // Tổng % >= 100 -> không thể định giá (cấu hình sai)
    return { price: 0, denom, numerator, invalid: true };
  }
  const raw = numerator / denom;
  const price = Math.round(raw / 1000) * 1000; // làm tròn nghìn
  return {
    price,
    raw: Math.round(raw),
    numerator: Math.round(numerator),
    denom: Number(denom.toFixed(4)),
    allocatedFixed: Math.round(fc / n), // FC/N phân bổ mỗi sp
  };
};

// Giá trị thuần có thể thực hiện được (NRV) cho 1 đơn vị (dùng LCNRV):
//   NRV = giá bán dự kiến SAU chiết khấu tối ưu − chi phí bán hàng
// sellPrice  : giá niêm yết hiện tại
// bestDiscPct: % giảm lớn nhất khả dĩ (HSSV/VIP tốt nhất) cho danh mục
// sellingCostPct: %M + %Gt (chi phí bán trên giá thực thu)
export const computeNRV = (sellPrice, bestDiscPct, sellingCostPct) => {
  const afterDiscount = sellPrice * (1 - bestDiscPct / 100);
  const sellingCost = afterDiscount * (sellingCostPct / 100);
  return Math.round(afterDiscount - sellingCost);
};
