// ============================================================
// MISC.VALIDATION.JS - SCHEMA ZOD CHO: BRAND, COUPON, BANNER,
//                      FEEDBACK, ADDRESS
// ------------------------------------------------------------
// Gom các schema "nhỏ" vào 1 file cho gọn. Nguyên tắc không đổi:
// "Never trust user input" - mọi trường đều ép kiểu + giới hạn độ dài.
// ============================================================

import { z } from "zod";

// ---------- BRAND ----------
export const createBrandSchema = z.object({
  name: z.string("Tên hãng phải là chuỗi").trim().min(1, "Vui lòng nhập tên hãng").max(50, "Tên hãng tối đa 50 ký tự"),
  logo: z.url("Logo phải là URL").optional().or(z.literal("")),
  description: z.string().trim().max(500).optional(),
});
export const updateBrandSchema = createBrandSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ---------- COUPON ----------
export const createCouponSchema = z
  .object({
    code: z
      .string("Mã phải là chuỗi")
      .trim()
      .toUpperCase()
      .min(3, "Mã ít nhất 3 ký tự")
      .max(30)
      // Chỉ chữ và số -> không thể nhét ký tự lạ vào mã
      .regex(/^[A-Z0-9]+$/, "Mã chỉ gồm chữ và số"),
    description: z.string().trim().max(200).optional(),
    discountType: z.enum(["percent", "fixed"], "Kiểu giảm không hợp lệ"),
    discountValue: z.number("Giá trị giảm phải là số").positive("Giá trị giảm phải > 0"),
    maxDiscount: z.number().nonnegative().optional(),
    minOrderValue: z.number().nonnegative().optional(),
    usageLimit: z.number().int().positive().max(100000).optional(),
    // z.coerce.date: nhận chuỗi ISO "2026-12-31" và tự đổi thành Date
    expiresAt: z.coerce.date("Ngày hết hạn không hợp lệ"),
  })
  // Ràng buộc chéo: kiểu percent thì giá trị phải <= 100
  .refine((d) => d.discountType !== "percent" || d.discountValue <= 100, {
    message: "Giảm theo % không được vượt quá 100",
    path: ["discountValue"],
  });

export const updateCouponSchema = z.object({
  description: z.string().trim().max(200).optional(),
  usageLimit: z.number().int().positive().max(100000).optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// Khách nhập mã ở trang giỏ hàng.
// BÀI HỌC TỪ BUG THẬT: middleware validate gán req.body = dữ liệu ĐÃ LỌC
// theo schema (chống mass assignment). Ban đầu schema này chỉ khai báo
// "code" -> trường itemsPrice client gửi kèm bị LỌC MẤT, server tưởng
// đơn 0đ và báo "chưa đạt đơn tối thiểu". Muốn nhận trường nào thì
// PHẢI khai báo trường đó trong schema!
// (itemsPrice ở đây chỉ để ƯỚC TÍNH hiển thị - tiền giảm thật được
// server tự tính lại từ DB lúc đặt hàng.)
export const applyCouponSchema = z.object({
  code: z.string("Mã phải là chuỗi").trim().toUpperCase().min(1, "Vui lòng nhập mã").max(30),
  itemsPrice: z.number("Tạm tính phải là số").nonnegative().optional(),
});

// ---------- BANNER ----------
export const createBannerSchema = z.object({
  title: z.string("Tiêu đề phải là chuỗi").trim().min(2, "Tiêu đề ít nhất 2 ký tự").max(120, "Tiêu đề tối đa 120 ký tự"),
  subtitle: z.string().trim().max(200).optional(),
  image: z.url("Ảnh phải là URL").optional().or(z.literal("")),
  link: z.string().trim().max(300).optional(),
  buttonLabel: z.string().trim().max(40).optional(),
  order: z.number().int().optional(),
});
export const updateBannerSchema = createBannerSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ---------- FEEDBACK (route public -> validate càng chặt càng tốt) ----------
export const createFeedbackSchema = z.object({
  name: z.string("Tên phải là chuỗi").trim().min(2, "Tên ít nhất 2 ký tự").max(100),
  email: z.email("Email không đúng định dạng").toLowerCase(),
  message: z
    .string("Nội dung phải là chuỗi")
    .trim()
    .min(10, "Nội dung góp ý ít nhất 10 ký tự")
    .max(2000, "Nội dung tối đa 2000 ký tự"),
});

// ---------- ADDRESS ----------
export const createAddressSchema = z.object({
  fullName: z
    .string("Họ tên phải là chuỗi")
    .trim()
    .min(2, "Họ tên quá ngắn (ít nhất 2 ký tự)")
    .max(100, "Họ tên tối đa 100 ký tự"),
  phone: z
    .string("Số điện thoại phải là chuỗi")
    .regex(/^0\d{9}$/, "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)"),
  address: z
    .string("Địa chỉ phải là chuỗi")
    .trim()
    .min(5, "Địa chỉ quá ngắn — vui lòng nhập số nhà, tên đường")
    .max(300, "Địa chỉ tối đa 300 ký tự"),
  city: z
    .string("Tỉnh/thành phải là chuỗi")
    .trim()
    .min(2, "Vui lòng chọn Tỉnh/Thành phố")
    .max(100, "Tỉnh/thành tối đa 100 ký tự"),
  isDefault: z.boolean().optional(),
});
export const updateAddressSchema = createAddressSchema.partial();
