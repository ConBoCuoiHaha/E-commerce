// ============================================================
// ORDER.ROUTE.JS - ENDPOINT ĐƠN HÀNG
// ------------------------------------------------------------
// TẤT CẢ route đơn hàng đều cần đăng nhập -> thay vì lặp lại
// protectRoute ở từng dòng, ta gắn 1 LẦN bằng router.use().
// Mọi route khai báo SAU dòng đó đều tự động được bảo vệ.
//
// THỨ TỰ ROUTE QUAN TRỌNG: "/my" phải khai báo TRƯỚC "/:id",
// nếu không Express sẽ hiểu "my" là một :id và chạy sai handler!
// ============================================================

import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  confirmPayment,
  sendInvoice,
} from "../controllers/order.controller.js";
import { getAdvancedStats, exportStatsExcel } from "../controllers/stats.controller.js";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validations/order.validation.js";

const router = express.Router();

// Gắn protectRoute cho TOÀN BỘ route bên dưới
router.use(protectRoute);

// --- User ---
router.post("/", validate(createOrderSchema), createOrder); // đặt hàng
router.get("/my", getMyOrders); // đơn của tôi (phải đứng trước /:id!)
router.put("/:id/cancel", cancelMyOrder); // hủy đơn của tôi

// --- Admin ---
router.get("/", requireAdmin, getAllOrders); // tất cả đơn
router.get("/stats/summary", requireAdmin, getOrderStats); // thống kê dashboard
router.get("/stats/advanced", requireAdmin, getAdvancedStats); // theo tháng/năm + phản hồi (v8)
router.get("/stats/export", requireAdmin, exportStatsExcel); // xuất Excel có màu (v8)
router.put("/:id/status", requireAdmin, validate(updateOrderStatusSchema), updateOrderStatus);
router.put("/:id/confirm-payment", requireAdmin, confirmPayment); // xác nhận đã nhận tiền (tay)
router.post("/:id/invoice", requireAdmin, sendInvoice); // gửi hóa đơn PDF qua email (v9)

// --- Chung (chủ đơn hoặc admin - kiểm tra trong controller) ---
router.get("/:id", getOrderById);

export default router;
