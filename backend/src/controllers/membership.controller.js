// ============================================================
// MEMBERSHIP.CONTROLLER.JS - HSSV + VIP (v10-P3)
// ------------------------------------------------------------
// Phía KHÁCH (cần đăng nhập):
//   - getMyMembership: xem hạng VIP, chi tiêu tích lũy, trạng thái HSSV
//   - requestStudentVerify: upload ảnh thẻ -> chờ kế toán duyệt
// Phía ADMIN:
//   - getStudentRequests: danh sách chờ duyệt + đã duyệt
//   - approveStudent / rejectStudent
// ============================================================

import User from "../models/user.model.js";
import SystemLog from "../models/systemLog.model.js";
import { getOrCreateAccountingSetting } from "./accounting.controller.js";

// Thông tin membership an toàn để trả cho khách
const membershipView = (user, setting) => ({
  vipTier: user.vipTier,
  accumulatedSpending: user.accumulatedSpending,
  memThreshold: setting.vipMemThreshold,
  vipThreshold: setting.vipVipThreshold,
  studentStatus: user.studentStatus,
  studentCardImage: user.studentCardImage,
  studentCardExpiry: user.studentCardExpiry,
  studentRejectReason: user.studentRejectReason,
  isStudentActive: user.isStudentActive(),
});

// GET /api/membership/me
export const getMyMembership = async (req, res) => {
  const setting = await getOrCreateAccountingSetting();
  const user = await User.findById(req.user._id);
  res.json(membershipView(user, setting));
};

// POST /api/membership/student-request  Body: { studentCardImage }
// Khách gửi ảnh thẻ HSSV để xin xác minh.
export const requestStudentVerify = async (req, res) => {
  const { studentCardImage } = req.body;
  const user = await User.findById(req.user._id);

  if (user.isStudentActive()) {
    return res.status(400).json({ message: "Tài khoản đang là HSSV còn hiệu lực" });
  }
  user.studentStatus = "pending";
  user.studentCardImage = studentCardImage;
  user.studentRejectReason = "";
  await user.save();

  res.json({ message: "Đã gửi yêu cầu xác minh HSSV. Vui lòng chờ duyệt." });
};

// ==================== ADMIN ====================

// GET /api/membership/student-requests?status=pending|approved|all
export const getStudentRequests = async (req, res) => {
  const filter = {};
  if (req.query.status === "pending") filter.studentStatus = "pending";
  else if (req.query.status === "approved") filter.studentStatus = "approved";
  else filter.studentStatus = { $in: ["pending", "approved", "rejected", "expired"] };

  const users = await User.find(filter)
    .select("name username email studentStatus studentCardImage studentCardExpiry studentVerifiedAt studentRejectReason vipTier")
    .sort({ studentStatus: 1, updatedAt: -1 });
  res.json(users);
};

// PUT /api/membership/student-requests/:id/approve  Body: { studentCardExpiry }
export const approveStudent = async (req, res) => {
  const { studentCardExpiry } = req.body;
  const expiry = new Date(studentCardExpiry);
  if (isNaN(expiry) || expiry <= new Date()) {
    return res.status(400).json({ message: "Ngày hết hạn thẻ phải ở tương lai" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

  user.studentStatus = "approved";
  user.studentCardExpiry = expiry;
  user.studentVerifiedAt = new Date();
  user.studentRejectReason = "";
  await user.save();

  await SystemLog.create({
    action: "HSSV_APPROVED",
    description: `Duyệt HSSV cho ${user.name}, hết hạn ${expiry.toLocaleDateString("vi-VN")}`,
    user: req.user._id,
    refId: user._id,
  });
  res.json({ message: `Đã duyệt HSSV cho ${user.name}` });
};

// PUT /api/membership/student-requests/:id/reject  Body: { reason }
export const rejectStudent = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

  user.studentStatus = "rejected";
  user.studentRejectReason = req.body.reason || "Ảnh thẻ không hợp lệ, vui lòng tải lại";
  await user.save();
  res.json({ message: "Đã từ chối yêu cầu HSSV" });
};
