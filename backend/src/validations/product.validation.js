// ============================================================
// PRODUCT.VALIDATION.JS - SCHEMA ZOD CHO SẢN PHẨM + BIẾN THỂ + REVIEW
// ============================================================

import { z } from "zod";

const objectIdSchema = z
  .string("ID phải là chuỗi")
  .regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

// --- Schema cho 1 biến thể (variant) ---
const variantSchema = z.object({
  name: z.string("Tên biến thể phải là chuỗi").trim().min(1, "Vui lòng nhập tên biến thể").max(150, "Tên biến thể tối đa 150 ký tự"),
  sku: z.string("SKU phải là chuỗi").trim().min(1, "Vui lòng nhập SKU").max(60, "SKU tối đa 60 ký tự"),
  price: z.number("Giá phải là số").nonnegative("Giá không được âm"),
  countInStock: z.number("Tồn kho phải là số").int().nonnegative(),
  ram: z.string().max(50).optional(),
  storage: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
});

// --- Schema cho attributes (thuộc tính lọc) ---
const attributesSchema = z
  .object({
    brand: z.string().max(50).optional(),
    cpu: z.string().max(80).optional(),
    gpu: z.string().max(80).optional(),
    ram: z.string().max(50).optional(),
    storage: z.string().max(50).optional(),
    screenSize: z.number().positive().optional(),
    needs: z.array(z.string().max(40)).optional(),
  })
  .optional();

export const createProductSchema = z.object({
  name: z.string("Tên sản phẩm phải là chuỗi").trim().min(2, "Tên sản phẩm ít nhất 2 ký tự").max(250, "Tên sản phẩm tối đa 250 ký tự"),
  description: z.string("Mô tả phải là chuỗi").trim().min(10, "Mô tả ít nhất 10 ký tự").max(5000),
  category: objectIdSchema,
  // price/countInStock cấp product có thể bỏ qua khi gửi variants
  // (controller sẽ tự tính), nhưng nếu không có variants thì cần price.
  price: z.number("Giá phải là số").nonnegative().optional(),
  originalPrice: z.number().nonnegative().optional(),
  image: z.url("Ảnh phải là URL hợp lệ").optional(),
  images: z.array(z.url()).optional(),
  attributes: attributesSchema,
  variants: z.array(variantSchema).optional(),
  // Bảng thông số chi tiết (v5): mảng {label, value} tối đa 40 dòng
  specifications: z
    .array(
      z.object({
        label: z.string("Tên thông số phải là chuỗi").trim().min(1, "Thiếu tên thông số").max(80, "Tên thông số tối đa 80 ký tự"),
        value: z.string("Giá trị thông số phải là chuỗi").trim().min(1, "Thiếu giá trị thông số").max(300, "Giá trị tối đa 300 ký tự"),
      })
    )
    .max(40, "Tối đa 40 dòng thông số")
    .optional(),
  isFeatured: z.boolean().optional(),
});

// Update: như create nhưng mọi trường optional + cho phép đổi isActive
// (v8: admin bật bán lại sản phẩm đã ẩn qua PUT {isActive: true})
export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean("isActive phải là true/false").optional(),
});

export const createReviewSchema = z.object({
  rating: z.number("Điểm phải là số").int().min(1, "Điểm thấp nhất 1").max(5, "Điểm cao nhất 5"),
  comment: z.string("Bình luận phải là chuỗi").trim().min(3, "Bình luận quá ngắn").max(1000),
});
