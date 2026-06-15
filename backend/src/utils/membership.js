// ============================================================
// MEMBERSHIP.JS - TÍNH CHIẾT KHẤU THEO HẠNG (HSSV / VIP) (v10-P3)
// ------------------------------------------------------------
// Quy tắc (theo Google Doc nghiệp vụ):
//   - Mỗi danh mục có ma trận: HSSV / H-MEM / H-VIP = {% , cap}.
//   - Khách được áp mức CÓ LỢI NHẤT giữa: ưu đãi HSSV (nếu thẻ còn
//     hiệu lực) và ưu đãi theo hạng VIP hiện tại.
//   - Giảm mỗi dòng = min(thành tiền dòng × %, cap) -> cap chống lạm dụng.
//   - Chiết khấu này GIẢM TRỪ DOANH THU (doanh thu thuần = thực thu),
//     khác với mã giảm giá coupon (cộng thêm trên nữa nếu có).
// ============================================================

// Lấy mức ưu đãi của 1 hạng cho 1 dòng hàng từ ma trận
const tierDeal = (row, tierKey) => row?.[tierKey] || { percent: 0, cap: 0 };

// Tính số tiền giảm cho 1 dòng theo 1 mức {percent, cap}
const dealAmount = (lineTotal, deal) => {
  if (!deal || !deal.percent) return 0;
  const raw = Math.round((lineTotal * deal.percent) / 100);
  // cap = 0 nghĩa là không giới hạn
  return deal.cap > 0 ? Math.min(raw, deal.cap) : raw;
};

// ------------------------------------------------------------
// computeMembershipDiscount
//   user      : document User (cần isStudentActive(), vipTier)
//   items     : [{ price, quantity, categorySlug, name }]
//   setting   : AccountingSetting (có discountMatrix)
// Trả về { total, appliedTier, breakdown:[{name, discount, source}] }
//   appliedTier: nhãn mô tả mức được áp (để hiển thị/giải thích)
// ------------------------------------------------------------
export const computeMembershipDiscount = (user, items, setting) => {
  const matrix = setting.discountMatrix || [];
  const byCat = new Map(matrix.map((r) => [r.categorySlug, r]));

  const studentActive = user.isStudentActive?.() || false;
  // Hạng VIP -> khóa ma trận tương ứng
  const vipKey = user.vipTier === "H-VIP" ? "vip" : user.vipTier === "H-MEM" ? "mem" : null;

  let total = 0;
  let usedStudent = false;
  let usedVip = false;
  const breakdown = [];

  for (const item of items) {
    const row = byCat.get(item.categorySlug);
    const lineTotal = item.price * item.quantity;

    // Ứng viên: ưu đãi HSSV (nếu thẻ còn hiệu lực) và ưu đãi VIP (nếu có hạng)
    const studentAmt = studentActive ? dealAmount(lineTotal, tierDeal(row, "student")) : 0;
    const vipAmt = vipKey ? dealAmount(lineTotal, tierDeal(row, vipKey)) : 0;

    // Chọn mức LỢI NHẤT cho khách
    const best = Math.max(studentAmt, vipAmt);
    if (best <= 0) continue;

    const source = studentAmt >= vipAmt ? "HSSV" : user.vipTier;
    if (source === "HSSV") usedStudent = true;
    else usedVip = true;

    total += best;
    breakdown.push({ name: item.name, discount: best, source });
  }

  // Nhãn mô tả mức áp dụng tổng thể
  let appliedTier = "Không";
  if (usedStudent && usedVip) appliedTier = "HSSV + VIP (theo từng sản phẩm)";
  else if (usedStudent) appliedTier = "Ưu đãi HSSV";
  else if (usedVip) appliedTier = `Ưu đãi ${user.vipTier}`;

  return { total, appliedTier, breakdown };
};

// Xác định hạng VIP theo tổng chi tiêu tích lũy + ngưỡng cấu hình
export const tierFromSpending = (spending, setting) => {
  if (spending >= setting.vipVipThreshold) return "H-VIP";
  if (spending >= setting.vipMemThreshold) return "H-MEM";
  return "H-NEW";
};
