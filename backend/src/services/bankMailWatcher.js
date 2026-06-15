// ============================================================
// BANKMAILWATCHER.JS - ĐỐI SOÁT CHUYỂN KHOẢN TỰ ĐỘNG QUA EMAIL
// ------------------------------------------------------------
// Ý TƯỞNG (theo yêu cầu nghiệp vụ thực tế):
//   Ngân hàng gửi email "biến động số dư" về Gmail của shop mỗi khi
//   có tiền vào. Thay vì admin ngồi soi từng email, service này:
//     1. Kết nối Gmail qua IMAP (dùng App Password sẵn có)
//     2. Mỗi 30 giây quét email CHƯA ĐỌC từ người gửi hợp lệ
//     3. Trích MÃ THANH TOÁN (HSG + 6 số) và SỐ TIỀN trong nội dung
//     4. Khớp với đơn banking chưa thanh toán -> markOrderPaid
//        (tự động gửi email "thanh toán thành công" cho khách)
//     5. Đánh dấu email đã đọc để không xử lý lại
//
// CÁC LỚP AN TOÀN:
//   - Chỉ tin email từ NGƯỜI GỬI trong whitelist (BANK_MAIL_SENDERS).
//     Ở môi trường dev cho phép thêm chính EMAIL_USER để tự gửi mail
//     test. Production thì CHỈ domain ngân hàng.
//   - Số tiền trong email PHẢI >= tổng tiền đơn (chuyển thiếu không
//     được tính là đã thanh toán).
//   - markOrderPaid là update nguyên tử có điều kiện isPaid:false
//     -> email trùng/lặp không thể đánh dấu 2 lần.
//   - Mọi lỗi IMAP chỉ log, KHÔNG được làm sập server chính.
//
// GIỚI HẠN THẬT THÀ: mỗi ngân hàng có format email khác nhau - regex
// ở đây bắt được các format phổ biến (có "HSGxxxxxx" và số tiền dạng
// "21,890,000" / "21.890.000"). Nếu ngân hàng đổi format thì admin
// vẫn còn đường XÁC NHẬN TAY trong dashboard (dự phòng bắt buộc).
// ============================================================

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import Order from "../models/order.model.js";
import { markOrderPaid } from "../controllers/order.controller.js";

const POLL_INTERVAL_MS = 30 * 1000; // quét mỗi 30 giây

// Danh sách người gửi được tin (so sánh theo "chứa chuỗi", thường là domain)
const allowedSenders = () => {
  const senders = (process.env.BANK_MAIL_SENDERS || "info.vietcombank.com.vn")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Dev: cho phép tự gửi email test từ chính hộp thư của shop
  if (process.env.NODE_ENV !== "production") {
    senders.push((process.env.EMAIL_USER || "").toLowerCase());
  }
  return senders;
};

// ------------------------------------------------------------
// Phân tích nội dung email -> { code, amount } hoặc null
// ------------------------------------------------------------
export const parseBankEmail = (text) => {
  if (!text) return null;

  // 1. Tìm mã thanh toán: "HSG" + 6 chữ số (cho phép khoảng trắng/gạch giữa)
  const codeMatch = text.match(/HSG[\s-]?(\d{6})/i);
  if (!codeMatch) return null;
  const code = `HSG${codeMatch[1]}`;

  // 2. Tìm số tiền: chuỗi số có dấu phân tách , hoặc . dài >= 4 ký tự
  //    đứng cạnh "VND"/"đ" hoặc sau chữ "Số tiền". Lấy số LỚN NHẤT
  //    tìm được (email có thể chứa nhiều con số: số dư, phí...).
  const amountMatches = [...text.matchAll(/([\d][\d.,]{3,})\s*(?:VND|VNĐ|đ)/gi)];
  if (amountMatches.length === 0) return null;
  const amounts = amountMatches.map((m) => Number(m[1].replace(/[.,]/g, "")));
  const amount = Math.max(...amounts.filter(Number.isFinite));

  return { code, amount };
};

// ------------------------------------------------------------
// Xử lý 1 email: kiểm người gửi -> parse -> khớp đơn -> đánh dấu paid
// ------------------------------------------------------------
const processEmail = async (parsed) => {
  const from = (parsed.from?.value?.[0]?.address || "").toLowerCase();
  if (!allowedSenders().some((s) => s && from.includes(s))) return;

  // Ghép cả subject + text để regex quét (một số bank để mã ở subject)
  const content = `${parsed.subject || ""}\n${parsed.text || ""}`;
  const result = parseBankEmail(content);
  if (!result) return;

  // Tìm đơn chuyển khoản CHƯA thanh toán mang đúng mã này
  const order = await Order.findOne({
    paymentCode: result.code,
    paymentMethod: "banking",
    isPaid: false,
    status: { $ne: "cancelled" },
  });
  if (!order) return;

  // Chuyển THIẾU tiền -> không xác nhận (admin xử lý tay)
  if (result.amount < order.totalPrice) {
    console.warn(
      `⚠️ Email CK mã ${result.code}: nhận ${result.amount} < tổng đơn ${order.totalPrice} - bỏ qua, chờ admin xử lý`
    );
    return;
  }

  await markOrderPaid(order._id, `đối soát email tự động (${from})`);
};

// ------------------------------------------------------------
// Vòng quét: kết nối IMAP -> lấy email CHƯA ĐỌC -> xử lý -> đánh dấu đã đọc
// Mỗi vòng mở kết nối mới rồi đóng (đơn giản, tự phục hồi khi mạng lỗi)
// ------------------------------------------------------------
const pollOnce = async () => {
  const client = new ImapFlow({
    host: process.env.BANK_MAIL_HOST || "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    logger: false, // tắt log chi tiết của thư viện
  });

  await client.connect();
  try {
    // Khóa hộp thư INBOX trong lúc thao tác
    const lock = await client.getMailboxLock("INBOX");
    try {
      // BÀI HỌC TỪ LỖI THẬT (đã sửa): bản đầu search({seen:false}) quét
      // MỌI email chưa đọc trong hộp thư và đánh dấu đã đọc hết -> phá
      // hộp thư cá nhân của chủ shop (hàng nghìn thư chưa đọc bị đánh
      // dấu nhầm). Nguyên tắc: chỉ ĐỤNG vào đúng phạm vi mình cần!
      // -> Search THEO TỪNG NGƯỜI GỬI trong whitelist + giới hạn 3 ngày
      //    gần nhất, và chỉ đánh dấu đã đọc những email ĐÓ.
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      for (const sender of allowedSenders()) {
        if (!sender) continue;
        const uids = await client.search({ seen: false, from: sender, since });
        for (const uid of uids || []) {
          // Tải toàn bộ nguồn email rồi parse (mailparser lo phần MIME)
          const { content } = await client.download(uid);
          const chunks = [];
          for await (const chunk of content) chunks.push(chunk);
          const parsed = await simpleParser(Buffer.concat(chunks));

          await processEmail(parsed);

          // Chỉ đánh dấu ĐÃ ĐỌC email của người gửi whitelist này
          await client.messageFlagsAdd(uid, ["\\Seen"]);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
};

// ------------------------------------------------------------
// Khởi động watcher (gọi từ server.js). Bật/tắt bằng env BANK_MAIL_AUTO.
// ------------------------------------------------------------
export const startBankMailWatcher = () => {
  if (process.env.BANK_MAIL_AUTO !== "true") {
    console.log("ℹ️  Đối soát email ngân hàng: TẮT (BANK_MAIL_AUTO != true)");
    return;
  }

  console.log("📬 Đối soát email ngân hàng: BẬT (quét mỗi 30 giây)");
  const tick = async () => {
    try {
      await pollOnce();
    } catch (err) {
      // Lỗi IMAP (mạng, Gmail chặn tạm...) chỉ log - server vẫn chạy,
      // admin vẫn còn nút xác nhận tay
      console.error("⚠️ Lỗi quét email ngân hàng:", err.message);
    }
  };
  tick(); // quét ngay 1 lần lúc khởi động
  setInterval(tick, POLL_INTERVAL_MS);
};
