// ============================================================
// CATEGORY.VALIDATION.JS - SCHEMA ZOD CHO DANH MỤC
// ============================================================

import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string("Tên danh mục phải là chuỗi").trim().min(2, "Tên ít nhất 2 ký tự").max(50),
  description: z.string().trim().max(500).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
