// ============================================================
// COUPON.CONTROLLER.JS - MÃ GIẢM GIÁ
// ------------------------------------------------------------
// 2 nhóm chức năng:
//   - Admin: CRUD mã giảm giá
//   - Khách: kiểm tra mã (POST /apply) ở trang giỏ hàng - server
//     trả về số tiền giảm DỰ KIẾN để hiển thị. Khi đặt hàng thật,
//     order.controller sẽ kiểm tra + trừ lượt LẠI LẦN NỮA (không
//     tin kết quả "đã kiểm tra trước đó" - trạng thái có thể đổi).
// ============================================================

import Coupon from "../models/coupon.model.js";

// Hàm dùng chung: kiểm tra 1 coupon có áp được cho itemsPrice không.
// Trả về { valid, message, discount }.
// export để order.controller.js dùng lại - logic kiểm tra chỉ viết 1 nơi.
export const checkCoupon = (coupon, itemsPrice) => {
  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "Mã giảm giá không tồn tại" };
  }
  if (coupon.expiresAt < new Date()) {
    return { valid: false, message: "Mã giảm giá đã hết hạn" };
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: "Mã giảm giá đã hết lượt sử dụng" };
  }
  if (itemsPrice < coupon.minOrderValue) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString("vi-VN")}₫ để dùng mã này`,
    };
  }
  return { valid: true, discount: coupon.calculateDiscount(itemsPrice) };
};

// ------------------------------------------------------------
// POST /api/coupons/apply - Khách kiểm tra mã (cần đăng nhập)
// Body: { code } + query itemsPrice từ giỏ hàng client gửi CHỈ ĐỂ
// ƯỚC TÍNH hiển thị. Số tiền giảm THẬT được tính lại lúc đặt hàng.
// ------------------------------------------------------------
export const applyCoupon = async (req, res) => {
  const { code } = req.body;
  const itemsPrice = Math.max(0, Number(req.body.itemsPrice) || 0);

  const coupon = await Coupon.findOne({ code });
  const result = checkCoupon(coupon, itemsPrice);

  if (!result.valid) return res.status(400).json({ message: result.message });

  res.json({
    code: coupon.code,
    description: coupon.description,
    discount: result.discount,
    message: `Áp dụng mã thành công - giảm ${result.discount.toLocaleString("vi-VN")}₫`,
  });
};

// ------------------------------------------------------------
// GET /api/coupons/available - Voucher khách DÙNG ĐƯỢC (cần đăng nhập)
// Hiển thị ở "Voucher của tôi" trong dashboard cá nhân (v7).
// Chỉ trả mã: đang bật + còn hạn + còn lượt. KHÔNG trả usedCount/
// usageLimit chi tiết (thông tin vận hành nội bộ) - chỉ báo "sắp hết lượt".
// ------------------------------------------------------------
export const getAvailableCoupons = async (req, res) => {
  const coupons = await Coupon.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
    $expr: { $lt: ["$usedCount", "$usageLimit"] },
  }).sort({ expiresAt: 1 }); // sắp hết hạn lên đầu

  res.json(
    coupons.map((c) => ({
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      maxDiscount: c.maxDiscount,
      minOrderValue: c.minOrderValue,
      expiresAt: c.expiresAt,
      // Còn dưới 20% tổng lượt -> nhắc khách dùng sớm
      almostOut: c.usageLimit - c.usedCount <= Math.ceil(c.usageLimit * 0.2),
    }))
  );
};

// ------------------------------------------------------------
// Admin CRUD
// ------------------------------------------------------------
export const getCoupons = async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons);
};

export const createCoupon = async (req, res) => {
  const coupon = await Coupon.create(req.body);
  res.status(201).json(coupon);
};

export const updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true, // bắt Mongoose chạy lại validate khi update
  });
  if (!coupon) return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
  res.json(coupon);
};

export const deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Không tìm thấy mã giảm giá" });
  res.json({ message: "Đã xóa mã giảm giá" });
};
