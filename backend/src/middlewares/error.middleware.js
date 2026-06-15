// ============================================================
// ERROR.MIDDLEWARE.JS - XỬ LÝ LỖI TẬP TRUNG
// ------------------------------------------------------------
// Thay vì mỗi controller tự try/catch rồi tự format lỗi (lặp code,
// dễ sót), ta gom hết về MỘT nơi:
//   - Controller chỉ cần `throw error` hoặc để lỗi tự nổi lên.
//   - Express 5 tự bắt lỗi async và chuyển tới middleware có
//     4 THAM SỐ (err, req, res, next) - đúng 4 tham số thì Express
//     mới hiểu đây là error handler.
//
// Bài học bảo mật: KHÔNG trả stack trace / chi tiết lỗi nội bộ
// cho client ở môi trường production - đó là thông tin quý giá
// giúp hacker hiểu cấu trúc hệ thống của bạn.
// ============================================================

// Bắt các request không khớp route nào -> 404
export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Không tìm thấy đường dẫn ${req.originalUrl}` });
};

// Error handler trung tâm (nhận diện qua đúng 4 tham số)
export const errorHandler = (err, req, res, next) => {
  // Log lỗi đầy đủ ra console server để dev debug
  console.error("❌ Lỗi:", err);

  // Mặc định 500 (lỗi server), có thể bị ghi đè bởi các case bên dưới
  let statusCode = err.statusCode || 500;
  let message = err.message || "Lỗi máy chủ";

  // --- Các lỗi quen thuộc của Mongoose, dịch sang thông báo dễ hiểu ---

  // 1. CastError: id gửi lên không đúng định dạng ObjectId
  //    (vd: GET /api/products/abc123xyz)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "ID không hợp lệ";
  }

  // 2. ValidationError: dữ liệu vi phạm schema (thiếu trường required,
  //    vượt maxlength...). Gom tất cả thông báo con lại.
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  }

  // 3. Lỗi trùng giá trị unique (code 11000), vd: đăng ký email đã tồn tại
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Giá trị của trường "${field}" đã tồn tại`;
  }

  // 4. Lỗi upload file (multer): file quá lớn, sai loại... -> lỗi của
  //    NGƯỜI DÙNG (400), không phải lỗi server (500)
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") message = "Ảnh quá lớn (tối đa 2MB)";
  }
  // Lỗi từ fileFilter của ta (sai loại ảnh) cũng là 400
  if (err.message?.startsWith("Chỉ chấp nhận ảnh")) statusCode = 400;

  res.status(statusCode).json({
    message,
    // Chỉ kèm stack trace khi đang development - production thì ẩn đi
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
