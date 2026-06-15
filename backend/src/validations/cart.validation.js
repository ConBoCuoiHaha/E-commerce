// ============================================================
// CART.VALIDATION.JS - SCHEMA ZOD CHO GIỎ HÀNG
// ------------------------------------------------------------
// Giỏ chỉ nhận THAM CHIẾU (id + số lượng) - không bao giờ nhận
// giá/tên từ client (server tự enrich từ DB khi đọc giỏ).
// ============================================================

import { z } from "zod";

const objectIdSchema = z
  .string("ID phải là chuỗi")
  .regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

const quantitySchema = z
  .number("Số lượng phải là số")
  .int("Số lượng phải là số nguyên")
  .min(1, "Số lượng tối thiểu 1")
  .max(100, "Số lượng tối đa 100");

export const addCartItemSchema = z.object({
  product: objectIdSchema,
  variantId: objectIdSchema.optional(),
  quantity: quantitySchema,
});

export const updateCartItemSchema = z.object({
  quantity: quantitySchema,
});

// Merge giỏ local: mảng item, giới hạn 50 dòng (giỏ local không thể
// "vô tình" có hơn - quá 50 là dấu hiệu payload bất thường)
export const mergeCartSchema = z.object({
  items: z
    .array(
      z.object({
        product: objectIdSchema,
        variantId: objectIdSchema.optional(),
        quantity: quantitySchema,
      }),
      "items phải là mảng"
    )
    .max(50, "Giỏ hàng tối đa 50 dòng"),
});
