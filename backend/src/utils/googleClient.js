// ============================================================
// GOOGLECLIENT.JS - XÁC MINH ID TOKEN CỦA GOOGLE
// ------------------------------------------------------------
// NGUYÊN TẮC BẢO MẬT QUAN TRỌNG NHẤT CỦA "ĐĂNG NHẬP BẰNG GOOGLE":
//   Frontend gửi lên một "ID token" (chuỗi JWT do GOOGLE ký).
//   Tuyệt đối KHÔNG được tin token đó ngay - phải để SERVER xác minh:
//     1. Chữ ký có đúng là của Google không? (verifyIdToken tự tải
//        khóa công khai của Google và kiểm tra chữ ký)
//     2. Token cấp cho ĐÚNG ứng dụng của ta không? (audience = Client ID)
//        -> chống "token nhầm app": kẻ xấu lấy token Google của 1 app
//           khác đem dùng cho app ta cũng bị từ chối.
//     3. Token còn hạn không?
//   Nếu bỏ bước này mà tin client, ai cũng có thể gửi 1 token tự chế
//   với email người khác để chiếm tài khoản.
//
// google-auth-library lo hết 3 việc trên trong verifyIdToken().
// ============================================================

import { OAuth2Client } from "google-auth-library";

// Client ID là thông tin CÔNG KHAI (nằm cả trong code frontend),
// dùng làm "audience" để verify. Không cần Client Secret cho luồng này.
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Trả về payload đã xác minh: { sub, email, email_verified, name, picture... }
// hoặc ném lỗi nếu token không hợp lệ (nơi gọi sẽ bắt và trả 401).
export const verifyGoogleToken = async (idToken) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID, // BẮT BUỘC khớp Client ID của ta
  });
  return ticket.getPayload();
};
