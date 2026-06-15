// ============================================================
// UPLOAD.ROUTE.JS - UPLOAD ẢNH VÀO MONGODB + SERVE ẢNH RA
// ------------------------------------------------------------
// CÁC LỚP BẢO MẬT BẮT BUỘC CỦA UPLOAD FILE (bài học quan trọng):
//   1. CHỈ admin được upload (protectRoute + requireAdmin).
//   2. WHITELIST loại file: chỉ jpg/png/webp. Kiểm tra MIMETYPE -
//      không bao giờ tin đuôi file (đổi virus.exe thành virus.jpg
//      là qua mặt được kiểm tra đuôi).
//   3. Giới hạn dung lượng 2MB - chống upload file khổng lồ làm
//      nghẽn RAM/DB (multer memoryStorage giữ file trong RAM).
//   4. KHÔNG dùng tên file client gửi làm định danh - id ngẫu nhiên
//      của MongoDB là định danh -> không có path traversal.
// ============================================================

import express from "express";
import multer from "multer";
import Image from "../models/image.model.js";
import { protectRoute, requireAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Các loại ảnh cho phép (whitelist - mặc định cấm tất cả trừ danh sách này)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// memoryStorage: file nằm trong RAM (req.file.buffer) -> ghi thẳng vào
// MongoDB, không chạm vào ổ đĩa (không lo dọn file rác).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    // cb(error) -> multer từ chối file, lỗi rơi vào error handler
    cb(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP"));
  },
});

// ------------------------------------------------------------
// POST /api/upload - Admin upload 1 ảnh, trả về URL để gắn vào
// sản phẩm/banner/QR. upload.single("image"): đọc field tên "image"
// từ form multipart/form-data.
// ------------------------------------------------------------
router.post(
  "/",
  protectRoute,
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file ảnh" });
    }

    const image = await Image.create({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user._id,
    });

    // Trả URL chuẩn - frontend gắn thẳng vào trường image của sản phẩm
    res.status(201).json({ url: `/api/images/${image._id}` });
  }
);

export default router;
