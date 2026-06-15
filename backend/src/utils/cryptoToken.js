// ============================================================
// CRYPTOTOKEN.JS - TẠO TOKEN NGẪU NHIÊN CHO EMAIL (xác thực / reset)
// ------------------------------------------------------------
// Dùng cho: link xác thực email, link đặt lại mật khẩu.
//
// NGUYÊN TẮC BẢO MẬT QUAN TRỌNG:
//   - Token gửi cho người dùng (qua email) là chuỗi NGẪU NHIÊN GỐC (raw).
//   - Trong DB ta CHỈ LƯU BẢN BĂM SHA-256 của token.
//   -> Nếu DB bị lộ (SQL/NoSQL injection, backup rò rỉ...), kẻ xấu
//      có hash cũng KHÔNG dùng được, vì link cần token gốc.
//   - Giống nguyên tắc băm mật khẩu, nhưng ở đây dùng SHA-256 thường
//     (không cần bcrypt chậm) vì token đã là 256-bit ngẫu nhiên,
//     không thể dò bằng brute-force như mật khẩu người tự đặt.
//
// crypto là MODULE CÓ SẴN của Node.js - không cần cài npm.
// (Repo mern-ecommerce cũ cài nhầm package "crypto" từ npm - đó là lỗi!)
// ============================================================

import crypto from "crypto";

// Tạo cặp { raw, hash }:
//   raw  -> nhét vào link email gửi người dùng
//   hash -> lưu vào DB để đối chiếu sau này
export const createRandomToken = () => {
  // 32 byte ngẫu nhiên từ nguồn an toàn mật mã học (CSPRNG) -> 64 ký tự hex
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = hashToken(raw);
  return { raw, hash };
};

// Băm SHA-256 một token (dùng khi nhận token từ link để đối chiếu DB)
export const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");
