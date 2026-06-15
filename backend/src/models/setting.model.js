// ============================================================
// SETTING.MODEL.JS - CẤU HÌNH CỬA HÀNG (SINGLETON)
// ------------------------------------------------------------
// Giải quyết yêu cầu thực tế: "shop đổi địa điểm/hotline/tài khoản
// ngân hàng thì sao?" -> các thông tin này KHÔNG hardcode trong code
// mà nằm trong DB, admin sửa qua dashboard, footer/trang thanh toán
// tự đọc theo.
//
// PATTERN SINGLETON: cả hệ thống chỉ có ĐÚNG 1 document cấu hình.
// Trường `key` cố định = "shop" + unique index đảm bảo điều đó.
// Đọc/ghi luôn qua findOneAndUpdate({key:"shop"}, ..., {upsert:true}).
// ============================================================

import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: "shop", unique: true },

    // --- Thông tin hiển thị footer ---
    hotline: { type: String, default: "1900 0000" },
    email: { type: String, default: "hugoboss.v6@gmail.com" },
    storeAddress: { type: String, default: "123 Quận 1" },
    storeCity: { type: String, default: "TP. Hồ Chí Minh" },
    copyright: {
      type: String,
      default:
        "© HungSaiGon 2026 — Website học tập, xây dựng phục vụ mục đích luyện tập lập trình MERN stack.",
    },
    facebook: { type: String, default: "https://facebook.com" },
    youtube: { type: String, default: "https://youtube.com" },
    tiktok: { type: String, default: "https://tiktok.com" },

    // --- Tài khoản ngân hàng nhận thanh toán (hiện ở trang chuyển khoản) ---
    bankName: { type: String, default: "Vietcombank" },
    bankAccountNumber: { type: String, default: "0123456789" },
    bankAccountHolder: { type: String, default: "NGUYEN VAN HUNG" },
    // Ảnh mã QR (URL trỏ tới /api/images/<id> sau khi admin upload)
    bankQrImage: { type: String, default: "" },
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);
export default Setting;
