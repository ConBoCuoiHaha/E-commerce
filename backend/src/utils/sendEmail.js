// ============================================================
// SENDEMAIL.JS - GỬI EMAIL QUA GMAIL SMTP (nodemailer)
// ------------------------------------------------------------
// Cách hoạt động:
//   - nodemailer tạo "transporter" = kênh kết nối tới máy chủ SMTP
//     của Gmail, xác thực bằng EMAIL_USER + EMAIL_APP_PASSWORD.
//   - App Password là mật khẩu 16 ký tự Google cấp RIÊNG cho ứng dụng
//     (KHÔNG phải mật khẩu Gmail thật). Có thể thu hồi bất cứ lúc nào
//     mà không ảnh hưởng tài khoản chính -> an toàn hơn nhiều.
//
// BẢO MẬT:
//   - Thông tin đăng nhập chỉ nằm trong .env (đã gitignore).
//   - Nội dung email do TA tự dựng (template string), dữ liệu người
//     dùng chỉ chèn vào phần text -> không cho người dùng điều khiển
//     header email (chống email header injection).
// ============================================================

import nodemailer from "nodemailer";

// LỖI ẨN ĐÃ SỬA (audit v9): trước đây transporter được tạo NGAY KHI
// IMPORT MODULE. Với ES Module, mọi import chạy TRƯỚC dòng
// dotenv.config() trong server.js (import hoisting) -> lúc tạo
// transporter, process.env.EMAIL_* có thể CHƯA tồn tại -> mọi email
// lỗi "Missing credentials" âm thầm. Sửa: LAZY-INIT - chỉ tạo
// transporter ở LẦN GỬI ĐẦU TIÊN (lúc đó env chắc chắn đã nạp),
// vẫn tái sử dụng kết nối cho các lần sau.
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail", // nodemailer tự điền host smtp.gmail.com, port 465, TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
};

// ------------------------------------------------------------
// Hàm gửi email tổng quát. attachments (tùy chọn): mảng file đính kèm
// theo định dạng nodemailer [{ filename, content (Buffer), contentType }].
// LƯU Ý cách dùng ở controller: KHÔNG để lỗi email làm hỏng nghiệp vụ
// chính (đặt hàng vẫn phải thành công dù email lỗi) -> nơi gọi sẽ
// .catch() và chỉ log lỗi, không throw.
// ------------------------------------------------------------
export const sendEmail = async ({ to, subject, html, attachments }) => {
  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
    attachments,
  });
  console.log(`📧 Đã gửi email "${subject}" tới ${to} (id: ${info.messageId})`);
  return info;
};

// ------------------------------------------------------------
// Template: GỬI HÓA ĐƠN PDF cho khách (v9)
// pdfBuffer: Buffer từ buildInvoicePdf - đính kèm trực tiếp,
// không ghi file tạm ra đĩa (sạch sẽ, không cần dọn rác).
// ------------------------------------------------------------
export const sendInvoiceEmail = async (order, buyer, pdfBuffer) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  const fmt = (n) => n.toLocaleString("vi-VN") + "₫";
  return sendEmail({
    to: buyer.email,
    subject: `HungSaiGon - Hóa đơn đơn hàng #${shortId}`,
    html: `
      <h2>Hóa đơn mua hàng</h2>
      <p>Chào ${buyer.name},</p>
      <p>HungSaiGon gửi bạn hóa đơn cho đơn hàng <b>#${shortId}</b>
         (tổng thanh toán <b>${fmt(order.totalPrice)}</b>) trong file PDF đính kèm.</p>
      <p>Cảm ơn bạn đã mua sắm tại HungSaiGon!</p>
      <p style="color:#888;font-size:12px">Hóa đơn demo phục vụ học tập, không có giá trị pháp lý về thuế.</p>
    `,
    attachments: [
      {
        filename: `hoa-don-${shortId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
};

// ------------------------------------------------------------
// Template: email XÁC THỰC TÀI KHOẢN (Phase 3)
// Link chứa token GỐC + userId; backend chỉ lưu hash của token.
// ------------------------------------------------------------
export const sendVerificationEmail = async (user, rawToken) => {
  const link = `${process.env.CLIENT_URL}/verify-email?id=${user._id}&token=${rawToken}`;
  return sendEmail({
    to: user.email,
    subject: "HungSaiGon - Xác thực tài khoản của bạn",
    html: `
      <h2>Chào ${user.name},</h2>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại <b>HungSaiGon</b>.</p>
      <p>Nhấn vào nút bên dưới để xác thực email (link có hiệu lực <b>24 giờ</b>):</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#E60073;color:#fff;border-radius:8px;text-decoration:none">Xác thực email</a></p>
      <p>Hoặc copy link: ${link}</p>
      <p style="color:#888">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
    `,
  });
};

// ------------------------------------------------------------
// Template: email ĐẶT LẠI MẬT KHẨU (Phase 3)
// Hạn 15 phút - link reset phải sống NGẮN vì nó tương đương mật khẩu.
// ------------------------------------------------------------
export const sendResetPasswordEmail = async (user, rawToken) => {
  const link = `${process.env.CLIENT_URL}/reset-password?id=${user._id}&token=${rawToken}`;
  return sendEmail({
    to: user.email,
    subject: "HungSaiGon - Yêu cầu đặt lại mật khẩu",
    html: `
      <h2>Chào ${user.name},</h2>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấn vào nút bên dưới để đặt mật khẩu mới (link có hiệu lực <b>15 phút</b>):</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#E60073;color:#fff;border-radius:8px;text-decoration:none">Đặt lại mật khẩu</a></p>
      <p>Hoặc copy link: ${link}</p>
      <p style="color:#888">Nếu bạn KHÔNG yêu cầu, hãy bỏ qua - mật khẩu của bạn vẫn an toàn.
      Tuyệt đối không chuyển tiếp email này cho người khác.</p>
    `,
  });
};

// ------------------------------------------------------------
// Template: XÁC NHẬN ĐÃ NHẬN THANH TOÁN (gửi cho KHÁCH) - v5
// Gửi khi: hệ thống đối soát được tiền vào tài khoản (tự động qua
// email ngân hàng) hoặc admin xác nhận tay.
// ------------------------------------------------------------
export const sendPaymentConfirmedEmail = async (order, buyer) => {
  const fmt = (n) => n.toLocaleString("vi-VN") + "₫";
  return sendEmail({
    to: buyer.email,
    subject: `HungSaiGon - Đã nhận thanh toán đơn #${order._id.toString().slice(-8).toUpperCase()}`,
    html: `
      <h2>Thanh toán thành công!</h2>
      <p>Chào ${buyer.name},</p>
      <p>HungSaiGon đã nhận được thanh toán <b>${fmt(order.totalPrice)}</b>
         cho đơn hàng <b>#${order._id.toString().slice(-8).toUpperCase()}</b>.</p>
      <p>Đơn hàng sẽ được giao đến địa chỉ:</p>
      <p style="background:#f4f6f8;padding:12px 16px;border-radius:8px">
        <b>${order.shippingAddress.fullName}</b> · ${order.shippingAddress.phone}<br/>
        ${order.shippingAddress.address}, ${order.shippingAddress.city}
      </p>
      <p>Cảm ơn quý khách đã mua sắm tại HungSaiGon!</p>
    `,
  });
};

// ------------------------------------------------------------
// Template: thông báo ĐƠN HÀNG MỚI gửi về email admin.
// Format tiền tệ bằng toLocaleString cho dễ đọc.
// ------------------------------------------------------------
export const sendNewOrderNotification = async (order, buyer) => {
  const fmt = (n) => n.toLocaleString("vi-VN") + "₫";

  const itemsHtml = order.orderItems
    .map(
      (i) =>
        `<li>${i.name}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity} — ${fmt(i.price * i.quantity)}</li>`
    )
    .join("");

  return sendEmail({
    to: process.env.EMAIL_USER, // thông báo về hộp thư admin (hugoboss.v6@gmail.com)
    subject: `🛒 HungSaiGon - Đơn hàng mới ${fmt(order.totalPrice)} từ ${buyer.name}`,
    html: `
      <h2>Đơn hàng mới trên HungSaiGon</h2>
      <p><b>Khách:</b> ${buyer.name} (${buyer.email})</p>
      <p><b>Mã đơn:</b> ${order._id}</p>
      <ul>${itemsHtml}</ul>
      <p><b>Tiền hàng:</b> ${fmt(order.itemsPrice)} · <b>Ship:</b> ${fmt(order.shippingPrice)}</p>
      <p style="font-size:18px"><b>Tổng: ${fmt(order.totalPrice)}</b></p>
      <p><b>Giao tới:</b> ${order.shippingAddress.fullName}, ${order.shippingAddress.phone},
         ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
      <p><b>Thanh toán:</b> ${order.paymentMethod.toUpperCase()}</p>
    `,
  });
};
