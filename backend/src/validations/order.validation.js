// ============================================================
// ORDER.VALIDATION.JS - SCHEMA ZOD CHO ĐƠN HÀNG (có BIẾN THỂ)
// ------------------------------------------------------------
// Client CHỈ gửi: product (id), variantId (nếu sản phẩm có biến thể),
// quantity. KHÔNG có price - giá do server tra từ DB theo đúng biến thể.
// (Nếu nhận giá từ client, kẻ xấu sửa request là mua RTX 4070 giá 1k!)
// ============================================================

import { z } from "zod";

const objectIdSchema = z
  .string("ID phải là chuỗi")
  .regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

export const createOrderSchema = z.object({
  orderItems: z
    .array(
      z.object({
        product: objectIdSchema,
        // variantId optional: sản phẩm không có biến thể thì không cần gửi
        variantId: objectIdSchema.optional(),
        quantity: z
          .number("Số lượng phải là số")
          .int("Số lượng phải là số nguyên")
          .min(1, "Số lượng tối thiểu 1")
          .max(100, "Số lượng tối đa 100 cho mỗi sản phẩm"),
      }),
      "orderItems phải là mảng"
    )
    .min(1, "Đơn hàng phải có ít nhất 1 sản phẩm")
    .max(50, "Đơn hàng tối đa 50 dòng sản phẩm"),
  // LƯU Ý: MỌI rule .min/.max đều phải kèm message tiếng Việt.
  // Bug thật từng gặp: .min(5) không có message -> Zod trả mặc định
  // tiếng Anh "Too small: expected string to have >=5 characters"
  // hiện thẳng lên màn hình khách hàng - rất thiếu chuyên nghiệp.
  shippingAddress: z.object({
    fullName: z
      .string("Họ tên phải là chuỗi")
      .trim()
      .min(2, "Họ tên người nhận quá ngắn (ít nhất 2 ký tự)")
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
  }),
  paymentMethod: z.enum(["cod", "banking"], "Phương thức thanh toán không hợp lệ"),
  // Mã giảm giá (tùy chọn) - chỉ nhận CHUỖI MÃ, server tự tra và tự
  // tính tiền giảm. Client không bao giờ được gửi số tiền giảm!
  couponCode: z
    .string("Mã phải là chuỗi")
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, "Mã không hợp lệ")
    .max(30)
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    ["pending", "confirmed", "shipping", "delivered", "cancelled"],
    "Trạng thái không hợp lệ"
  ),
});
