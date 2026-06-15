// ============================================================
// COSTING.JS - TÍNH GIÁ VỐN: Ceff + XUẤT KHO FIFO
// ------------------------------------------------------------
// 2 khái niệm cốt lõi (theo Google Doc nghiệp vụ):
//
// 1. CHI PHÍ HIỆU DỤNG (Ceff): giá vốn THỰC của 1 đơn vị sau khi
//    cộng chi phí lưu kho tích lũy theo thời gian nằm kho:
//        Ceff = C0 × (1 + h × t)
//    - C0 = giá nhập gốc của lô
//    - h  = tỷ lệ chi phí lưu kho/năm theo DANH MỤC (laptop 15%, ...)
//    - t  = số NĂM lưu kho = (thời điểm xuất − ngày nhập) / 365 ngày
//    -> Hàng nằm kho càng lâu, giá vốn hiệu dụng càng cao -> báo cáo
//       lợi nhuận gộp phản ánh đúng sự bào mòn do tồn kho.
//
// 2. XUẤT KHO FIFO (Nhập trước - Xuất trước): khi bán, trừ tồn từ LÔ
//    CŨ NHẤT trước. Mỗi lô có giá nhập riêng -> giá vốn hàng bán bám
//    đúng lô được xuất, đồng thời "đẩy" hàng cũ đi trước (đúng nghiệp
//    vụ hàng công nghệ mau lỗi thời).
// ============================================================

import PurchaseBatch from "../models/purchaseBatch.model.js";

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

// Lấy cấu hình (carrying rate, depreciation) cho 1 danh mục từ setting.
// Không có cấu hình riêng -> dùng giá trị mặc định.
export const getCategoryConfig = (setting, categorySlug) => {
  const cfg = setting.categoryConfigs?.find((c) => c.categorySlug === categorySlug);
  return {
    carryingRatePct: cfg ? cfg.carryingRatePct : setting.defaultCarryingRatePct,
    depreciationPct: cfg ? cfg.depreciationPct : setting.defaultDepreciationPct,
  };
};

// Số năm lưu kho (có thể là số thập phân: 0.5 năm = 6 tháng)
export const yearsInStock = (importDate, asOf = new Date()) =>
  Math.max(0, (asOf - new Date(importDate)) / MS_PER_YEAR);

// Ceff cho 1 đơn vị
export const computeCeff = (importPrice, importDate, carryingRatePct, asOf = new Date()) => {
  const t = yearsInStock(importDate, asOf);
  return importPrice * (1 + (carryingRatePct / 100) * t);
};

// ------------------------------------------------------------
// XUẤT KHO FIFO cho 1 (product, variant, quantity).
// - Tìm các lô CÒN HÀNG của sản phẩm/biến thể, sắp theo importDate tăng dần.
// - Trừ dần quantityInstock từ lô cũ nhất, cộng dồn giá vốn (C0 và Ceff).
// - LƯU thay đổi quantityInstock vào DB.
// Trả về { cogsC0, cogsCeff, consumed, shortage, layers }.
//   cogsCeff = giá vốn hiệu dụng (dùng kết chuyển giá vốn hàng bán)
//   shortage = số lượng KHÔNG có lô phủ (hàng chưa có dữ liệu lô)
// carryingRatePct truyền vào để tính Ceff theo danh mục của sản phẩm.
// ------------------------------------------------------------
export const consumeFifo = async (productId, variantId, quantity, carryingRatePct, asOf = new Date()) => {
  // Lấy mọi lô có dòng khớp sản phẩm/biến thể và còn hàng, cũ nhất trước
  const variantMatch = variantId ? { "items.variantId": variantId } : {};
  const batches = await PurchaseBatch.find({
    "items.product": productId,
    ...variantMatch,
  }).sort({ importDate: 1 });

  let remaining = quantity;
  let cogsC0 = 0;
  let cogsCeff = 0;
  const layers = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    // Trong 1 lô có thể có nhiều dòng (hiếm) - duyệt dòng khớp
    for (const item of batch.items) {
      if (remaining <= 0) break;
      const sameProduct = item.product.toString() === productId.toString();
      const sameVariant = variantId
        ? String(item.variantId) === String(variantId)
        : !item.variantId;
      if (!sameProduct || !sameVariant || item.quantityInstock <= 0) continue;

      const take = Math.min(item.quantityInstock, remaining);
      const ceffUnit = computeCeff(item.importPrice, batch.importDate, carryingRatePct, asOf);

      item.quantityInstock -= take;
      remaining -= take;
      cogsC0 += item.importPrice * take;
      cogsCeff += ceffUnit * take;
      layers.push({
        batchId: batch._id,
        quantity: take,
        importPrice: item.importPrice,
        ceffUnit: Math.round(ceffUnit),
        yearsStored: Number(yearsInStock(batch.importDate, asOf).toFixed(2)),
      });
    }
    await batch.save(); // lưu quantityInstock đã trừ
  }

  return {
    cogsC0: Math.round(cogsC0),
    cogsCeff: Math.round(cogsCeff),
    consumed: quantity - remaining,
    shortage: remaining, // >0 nghĩa là thiếu lô phủ (hàng chưa có giá vốn)
    layers,
  };
};

// ------------------------------------------------------------
// HOÀN KHO FIFO (khi hủy đơn ĐÃ xuất kho): cộng trả quantityInstock
// vào đúng các lô đã trừ (theo layers đã lưu trên orderItem).
// ------------------------------------------------------------
export const restoreFifo = async (layers) => {
  if (!layers?.length) return;
  for (const layer of layers) {
    const batch = await PurchaseBatch.findById(layer.batchId);
    if (!batch || !batch.items.length) continue;
    // Cộng trả vào dòng đầu của đúng lô đã trừ (đủ chính xác cho demo)
    batch.items[0].quantityInstock += layer.quantity;
    await batch.save();
  }
};
