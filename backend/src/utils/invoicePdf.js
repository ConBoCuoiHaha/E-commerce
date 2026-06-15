// ============================================================
// INVOICEPDF.JS - TẠO HÓA ĐƠN BÁN HÀNG DẠNG PDF (v9)
// ------------------------------------------------------------
// Dùng pdfkit vẽ PDF phía server. LƯU Ý QUAN TRỌNG VỀ FONT:
// font có sẵn của PDF (Helvetica...) KHÔNG có dấu tiếng Việt ->
// phải nhúng font TTF hỗ trợ tiếng Việt. Dùng "Be Vietnam Pro"
// (giấy phép mở OFL, thiết kế riêng cho tiếng Việt) đặt tại
// src/assets/fonts/.
//
// Hóa đơn DEMO phục vụ học tập - thông tin người bán cấu hình bên dưới.
// Hàm trả về Promise<Buffer> để đính kèm thẳng vào email.
// ============================================================

import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";

// __dirname không tồn tại trong ES Module -> tự dựng từ import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT = path.join(__dirname, "../assets/fonts/BeVietnamPro-Regular.ttf");
const FONT_BOLD = path.join(__dirname, "../assets/fonts/BeVietnamPro-Bold.ttf");

// Thông tin NGƯỜI BÁN trên hóa đơn (demo theo yêu cầu chủ shop)
const SELLER = {
  company: "CÔNG TY TNHH SG TECH",
  taxCode: "0318822649-DEMO", // MST demo ngẫu nhiên - không phải MST thật
  address: "47/70B Nguyễn Hữu Tiến, Phường Tây Thạnh, Thành phố Hồ Chí Minh",
  brand: "HungSaiGon",
};

const fmt = (n) => (n ?? 0).toLocaleString("vi-VN") + " ₫";

// ------------------------------------------------------------
// Tạo PDF hóa đơn cho 1 đơn hàng. order cần populate user (name, email).
// ------------------------------------------------------------
export const buildInvoicePdf = (order, buyer) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Gom các "chunk" dữ liệu PDF vào mảng -> nối thành Buffer khi xong
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("viet", FONT);
    doc.registerFont("viet-bold", FONT_BOLD);

    const BLUE = "#0065ee";
    const GRAY = "#71717a";
    const shortId = order._id.toString().slice(-8).toUpperCase();

    // ===== Header: thương hiệu + tiêu đề =====
    doc.font("viet-bold").fontSize(22).fillColor(BLUE).text("HungSaiGon", 50, 50);
    doc.font("viet").fontSize(9).fillColor(GRAY)
      .text("Laptop & Thiết bị công nghệ chính hãng", 50, 76);

    doc.font("viet-bold").fontSize(16).fillColor("#18181b")
      .text("HÓA ĐƠN BÁN HÀNG", 300, 52, { width: 245, align: "right" });
    doc.font("viet").fontSize(9).fillColor(GRAY)
      .text(`Số: HD-${shortId}  ·  (Bản demo học tập)`, 300, 74, { width: 245, align: "right" })
      .text(`Ngày xuất: ${new Date().toLocaleString("vi-VN")}`, 300, 86, { width: 245, align: "right" });

    // Kẻ ngang phân cách
    doc.moveTo(50, 105).lineTo(545, 105).strokeColor(BLUE).lineWidth(1.5).stroke();

    // ===== Bên bán / Bên mua (2 cột) =====
    let y = 118;
    doc.font("viet-bold").fontSize(10).fillColor("#18181b").text("ĐƠN VỊ BÁN HÀNG", 50, y);
    doc.font("viet").fontSize(9).fillColor("#3f3f46")
      .text(SELLER.company, 50, y + 14, { width: 240 })
      .text(`MST: ${SELLER.taxCode}`, 50, y + 27)
      .text(SELLER.address, 50, y + 40, { width: 240 });

    doc.font("viet-bold").fontSize(10).fillColor("#18181b").text("KHÁCH HÀNG", 310, y);
    doc.font("viet").fontSize(9).fillColor("#3f3f46")
      .text(`${order.shippingAddress.fullName}  ·  ${order.shippingAddress.phone}`, 310, y + 14, { width: 235 })
      .text(`Email: ${buyer.email}`, 310, y + 27, { width: 235 })
      .text(`Địa chỉ: ${order.shippingAddress.address}, ${order.shippingAddress.city}`, 310, y + 40, { width: 235 });

    // ===== Bảng sản phẩm =====
    y = 195;
    // Header bảng nền xanh
    doc.rect(50, y, 495, 22).fill(BLUE);
    doc.font("viet-bold").fontSize(9).fillColor("#ffffff");
    doc.text("STT", 56, y + 6, { width: 26 });
    doc.text("Sản phẩm", 86, y + 6, { width: 240 });
    doc.text("SL", 330, y + 6, { width: 30, align: "center" });
    doc.text("Đơn giá", 365, y + 6, { width: 85, align: "right" });
    doc.text("Thành tiền", 455, y + 6, { width: 85, align: "right" });

    y += 22;
    doc.font("viet").fontSize(9).fillColor("#18181b");
    order.orderItems.forEach((item, i) => {
      const name = item.variantName ? `${item.name} (${item.variantName})` : item.name;
      const rowHeight = Math.max(20, doc.heightOfString(name, { width: 240 }) + 8);
      // Sọc xen kẽ cho dễ đọc
      if (i % 2 === 1) doc.rect(50, y, 495, rowHeight).fill("#eff4ff").fillColor("#18181b");
      doc.text(String(i + 1), 56, y + 5, { width: 26 });
      doc.text(name, 86, y + 5, { width: 240 });
      doc.text(String(item.quantity), 330, y + 5, { width: 30, align: "center" });
      doc.text(fmt(item.price), 365, y + 5, { width: 85, align: "right" });
      doc.text(fmt(item.price * item.quantity), 455, y + 5, { width: 85, align: "right" });
      y += rowHeight;
    });
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#d9e2f5").lineWidth(1).stroke();

    // ===== Tổng kết tiền =====
    y += 10;
    const moneyLine = (label, value, bold = false, color = "#18181b") => {
      doc.font(bold ? "viet-bold" : "viet").fontSize(bold ? 12 : 9.5).fillColor(color);
      // Cột nhãn rộng 165 (đủ cho "TỔNG THANH TOÁN:" cỡ chữ 12 không bị
      // xuống dòng - lỗi nhỏ phát hiện khi soát bản in thử)
      doc.text(label, 285, y, { width: 165, align: "right" });
      doc.text(value, 455, y, { width: 85, align: "right" });
      y += bold ? 20 : 15;
    };
    moneyLine("Tiền hàng:", fmt(order.itemsPrice));
    moneyLine("Phí vận chuyển:", fmt(order.shippingPrice));
    if (order.discountPrice > 0) {
      moneyLine(`Giảm giá (${order.couponCode}):`, `-${fmt(order.discountPrice)}`, false, "#d92d20");
    }
    moneyLine("TỔNG THANH TOÁN:", fmt(order.totalPrice), true, BLUE);

    doc.font("viet").fontSize(9).fillColor(GRAY).text(
      `Hình thức thanh toán: ${order.paymentMethod === "cod" ? "Tiền mặt khi nhận hàng (COD)" : "Chuyển khoản ngân hàng"}` +
        (order.isPaid ? `  ·  Đã thanh toán lúc ${new Date(order.paidAt).toLocaleString("vi-VN")}` : "  ·  Chưa thanh toán"),
      50, y + 6
    );

    // ===== Chân trang =====
    doc.font("viet").fontSize(8).fillColor(GRAY).text(
      "Hóa đơn DEMO được tạo tự động bởi hệ thống HungSaiGon phục vụ mục đích học tập - không có giá trị pháp lý về thuế.\n" +
        "Mọi thắc mắc về đơn hàng vui lòng liên hệ hotline hoặc email của cửa hàng.",
      50, 760, { width: 495, align: "center" }
    );

    doc.end();
  });
