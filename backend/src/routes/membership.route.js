// ============================================================
// MEMBERSHIP.ROUTE.JS - HSSV + VIP (v10-P3)
// ============================================================

import express from "express";
import { z } from "zod";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  getMyMembership, requestStudentVerify,
  getStudentRequests, approveStudent, rejectStudent,
} from "../controllers/membership.controller.js";

const studentRequestSchema = z.object({
  studentCardImage: z.string("Ảnh thẻ phải là chuỗi").trim().min(1, "Vui lòng upload ảnh thẻ").max(300),
});
const approveSchema = z.object({
  studentCardExpiry: z.coerce.date("Ngày hết hạn không hợp lệ"),
});

const router = express.Router();
router.use(protectRoute); // toàn bộ cần đăng nhập

// --- Khách ---
router.get("/me", getMyMembership);
router.post("/student-request", validate(studentRequestSchema), requestStudentVerify);

// --- Admin ---
router.get("/student-requests", requireAdmin, getStudentRequests);
router.put("/student-requests/:id/approve", requireAdmin, validate(approveSchema), approveStudent);
router.put("/student-requests/:id/reject", requireAdmin, rejectStudent);

export default router;
