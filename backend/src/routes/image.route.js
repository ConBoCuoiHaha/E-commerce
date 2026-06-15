// ============================================================
// IMAGE.ROUTE.JS - SERVE ẢNH TỪ MONGODB (public)
// ------------------------------------------------------------
// GET /api/images/:id -> trả dữ liệu nhị phân với Content-Type đúng.
// Cache-Control 30 ngày: ảnh là BẤT BIẾN (đổi ảnh = upload cái mới,
// id mới) nên trình duyệt cache thoải mái -> giảm tải DB rõ rệt.
// ============================================================

import express from "express";
import mongoose from "mongoose";
import Image from "../models/image.model.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  // Chặn sớm id sai định dạng (tránh CastError + đỡ 1 lần query)
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Không tìm thấy ảnh" });
  }

  const image = await Image.findById(req.params.id);
  if (!image) return res.status(404).json({ message: "Không tìm thấy ảnh" });

  res.set({
    "Content-Type": image.contentType,
    "Content-Length": image.size,
    "Cache-Control": "public, max-age=2592000, immutable", // 30 ngày
  });
  res.send(image.data);
});

export default router;
