// ============================================================
// VALIDATE.MIDDLEWARE.JS - KIỂM TRA DỮ LIỆU ĐẦU VÀO BẰNG ZOD
// ------------------------------------------------------------
// NGUYÊN TẮC BẢO MẬT SỐ 1: "NEVER TRUST USER INPUT"
// (không bao giờ tin dữ liệu người dùng gửi lên)
//
// Validation ở backend giúp chống:
//   1. NoSQL INJECTION: nếu không kiểm tra kiểu dữ liệu, kẻ xấu có
//      thể gửi  { "email": { "$gt": "" }, "password": {...} }
//      thay vì chuỗi -> câu query Mongo bị bẻ cong logic.
//      Zod ép email PHẢI là string đúng định dạng -> object lạ bị
//      chặn ngay từ cửa, không bao giờ chạm tới câu query.
//   2. Dữ liệu rác: thiếu trường, sai kiểu, quá dài...
//   3. MASS ASSIGNMENT: ta chỉ "cho qua" các trường khai báo trong
//      schema (parse trả về dữ liệu đã lọc) - kẻ xấu gửi thêm
//      { "role": "admin" } khi đăng ký cũng bị vứt bỏ.
//
// Cách dùng trong route:
//   router.post("/signup", validate(signupSchema), signup)
// ============================================================

export const validate = (schema) => (req, res, next) => {
  // safeParse: kiểm tra req.body theo schema, KHÔNG ném lỗi mà trả
  // về object { success, data, error } -> dễ kiểm soát luồng xử lý
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Gom các lỗi thành mảng dễ đọc: [{ field, message }]
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    // 400 Bad Request: dữ liệu gửi lên không hợp lệ
    return res.status(400).json({
      message: errors[0]?.message || "Dữ liệu không hợp lệ",
      errors,
    });
  }

  // QUAN TRỌNG: gán lại req.body = result.data (dữ liệu ĐÃ ĐƯỢC LỌC).
  // Mọi trường không khai báo trong schema đều bị loại bỏ
  // -> controller phía sau chỉ nhận được dữ liệu sạch.
  req.body = result.data;
  next();
};
