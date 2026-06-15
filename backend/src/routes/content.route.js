// ============================================================
// CONTENT.ROUTE.JS - ROUTES CHO SETTING (cấu hình) + PAGE (bài viết)
// ============================================================

import express from "express";
import { z } from "zod";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getSettings, updateSettings } from "../controllers/setting.controller.js";
import {
  getPages, getAllPages, getPageBySlug, createPage, updatePage, deletePage,
} from "../controllers/page.controller.js";

// ---------- Zod schemas (khai báo tại chỗ vì ngắn) ----------
const updateSettingsSchema = z.object({
  hotline: z.string("Hotline phải là chuỗi").trim().max(30, "Hotline tối đa 30 ký tự").optional(),
  email: z.email("Email không đúng định dạng").optional(),
  storeAddress: z.string().trim().max(200, "Địa chỉ tối đa 200 ký tự").optional(),
  storeCity: z.string().trim().max(100, "Tỉnh/thành tối đa 100 ký tự").optional(),
  copyright: z.string().trim().max(500, "Copyright tối đa 500 ký tự").optional(),
  facebook: z.string().trim().max(300).optional(),
  youtube: z.string().trim().max(300).optional(),
  tiktok: z.string().trim().max(300).optional(),
  bankName: z.string().trim().max(100, "Tên ngân hàng tối đa 100 ký tự").optional(),
  // v8: nới giới hạn độ dài theo yêu cầu chủ shop (STK một số ngân
  // hàng rất dài) - vẫn bắt buộc CHỈ GỒM CHỮ SỐ (chống nhập rác/script)
  bankAccountNumber: z
    .string("Số tài khoản phải là chuỗi")
    .trim()
    .regex(/^[0-9]{4,50}$/, "Số tài khoản chỉ gồm chữ số (4-50 số)")
    .optional(),
  bankAccountHolder: z.string().trim().max(100, "Tên chủ tài khoản tối đa 100 ký tự").optional(),
  bankQrImage: z.string().trim().max(300).optional(),
});

const pageSchema = z.object({
  title: z.string("Tiêu đề phải là chuỗi").trim().min(2, "Tiêu đề ít nhất 2 ký tự").max(150),
  content: z
    .string("Nội dung phải là chuỗi")
    .trim()
    .min(10, "Nội dung ít nhất 10 ký tự")
    .max(20000, "Nội dung tối đa 20000 ký tự"),
  order: z.number("Thứ tự phải là số").int().optional(),
  isActive: z.boolean().optional(),
});

// ---------- SETTINGS ----------
export const settingRouter = express.Router();
settingRouter.get("/", getSettings); // public (footer + trang thanh toán đọc)
settingRouter.put("/", protectRoute, requireAdmin, validate(updateSettingsSchema), updateSettings);

// ---------- PAGES ----------
export const pageRouter = express.Router();
pageRouter.get("/", getPages); // public - footer
pageRouter.get("/all", protectRoute, requireAdmin, getAllPages);
pageRouter.get("/:slug", getPageBySlug); // public - trang bài viết
pageRouter.post("/", protectRoute, requireAdmin, validate(pageSchema), createPage);
pageRouter.put("/:id", protectRoute, requireAdmin, validate(pageSchema.partial()), updatePage);
pageRouter.delete("/:id", protectRoute, requireAdmin, deletePage);
