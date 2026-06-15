// ============================================================
// DB.JS - KẾT NỐI MONGODB BẰNG MONGOOSE
// ------------------------------------------------------------
// Mongoose là thư viện ODM (Object Document Mapper):
//   - Cho phép định nghĩa Schema (khuôn dữ liệu) cho document
//   - Tự validate dữ liệu trước khi lưu
//   - Cung cấp API tiện lợi: find, create, updateOne...
// ============================================================

import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    // mongoose.connect trả về Promise -> dùng await để đợi kết nối xong
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Đã kết nối MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    // process.exit(1): thoát chương trình với mã lỗi 1 (khác 0 = có lỗi).
    // Fail fast: DB là "trái tim" của app, không có DB thì chạy tiếp vô nghĩa.
    process.exit(1);
  }
};
