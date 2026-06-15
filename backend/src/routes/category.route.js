// ============================================================
// CATEGORY.ROUTE.JS - ENDPOINT DANH MỤC
// ------------------------------------------------------------
// Xem: public | Tạo/sửa/xóa: protectRoute + requireAdmin
// ============================================================

import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/category.validation.js";

const router = express.Router();

// Ai cũng xem được danh mục
router.get("/", getCategories);

// Các thao tác ghi: phải đăng nhập VÀ là admin
router.post("/", protectRoute, requireAdmin, validate(createCategorySchema), createCategory);
router.put("/:id", protectRoute, requireAdmin, validate(updateCategorySchema), updateCategory);
router.delete("/:id", protectRoute, requireAdmin, deleteCategory);

export default router;
