// ============================================================
// IMAGE.MODEL.JS - ẢNH LƯU TRỰC TIẾP TRONG MONGODB (theo yêu cầu)
// ------------------------------------------------------------
// Ảnh lưu dạng Buffer (nhị phân) trong document. Trade-off cần biết:
//   + Ưu: tự chứa trong DB (backup DB là có cả ảnh), không quản lý
//     thư mục file, không cần dịch vụ ngoài.
//   - Nhược: document to làm DB phình, đọc ảnh tốn RAM hơn so với
//     CDN/Cloudinary. Với shop nhỏ + ảnh đã nén ≤ 2MB thì chấp nhận được.
// (Giới hạn document MongoDB là 16MB -> ta chặn upload 2MB là an toàn.)
//
// Ảnh được serve qua GET /api/images/:id với header Content-Type đúng
// và Cache-Control dài hạn (ảnh bất biến - đổi ảnh là tạo id mới).
// ============================================================

import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    // Dữ liệu nhị phân của ảnh
    data: { type: Buffer, required: true },
    // Kiểu MIME thật đã kiểm tra ở middleware upload (image/jpeg...)
    contentType: { type: String, required: true },
    // Tên gốc chỉ để admin nhận diện - KHÔNG dùng làm đường dẫn
    originalName: { type: String, default: "" },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Image = mongoose.model("Image", imageSchema);
export default Image;
