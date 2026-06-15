// ============================================================
// INVENTORY.ROUTE.JS - ROUTES KHO HÀNG & KẾ TOÁN (TOÀN BỘ ADMIN)
// ============================================================

import express from "express";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  createBatch, getBatches, getInventoryOverview,
  getLcnrvReport, createClearanceSale,
} from "../controllers/inventory.controller.js";
import {
  getAccountingSettings, updateAccountingSettings, priceCalc, applyPrice,
} from "../controllers/accounting.controller.js";
import {
  createSupplierSchema, updateSupplierSchema, createBatchSchema, updateAccountingSchema,
} from "../validations/inventory.validation.js";

const router = express.Router();
// Mọi route kho hàng/kế toán đều yêu cầu quyền admin
router.use(protectRoute, requireAdmin);

// --- Nhà cung cấp ---
router.get("/suppliers", getSuppliers);
router.post("/suppliers", validate(createSupplierSchema), createSupplier);
router.put("/suppliers/:id", validate(updateSupplierSchema), updateSupplier);
router.delete("/suppliers/:id", deleteSupplier);

// --- Lô nhập ---
router.get("/batches", getBatches);
router.post("/batches", validate(createBatchSchema), createBatch);

// --- Dashboard tài chính kho ---
router.get("/overview", getInventoryOverview);
router.get("/lcnrv", getLcnrvReport); // đánh giá lại tồn kho + trích lập dự phòng (P4)
router.post("/clearance", createClearanceSale); // tạo chương trình xả kho (P4)

export default router;

// Router cấu hình kế toán (mount riêng ở /api/accounting)
export const accountingRouter = express.Router();
accountingRouter.use(protectRoute, requireAdmin);
accountingRouter.get("/settings", getAccountingSettings);
accountingRouter.put("/settings", validate(updateAccountingSchema), updateAccountingSettings);
accountingRouter.post("/price-calc", priceCalc); // máy tính định giá động (P4)
accountingRouter.post("/apply-price", applyPrice); // áp giá lên website (P4)
