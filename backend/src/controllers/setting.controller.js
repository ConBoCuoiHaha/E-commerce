// ============================================================
// SETTING.CONTROLLER.JS - CẤU HÌNH CỬA HÀNG (singleton)
// ------------------------------------------------------------
// GET  /api/settings  (public) - footer + trang thanh toán đọc
// PUT  /api/settings  (admin)  - sửa hotline/địa chỉ/tài khoản NH...
// ============================================================

import Setting from "../models/setting.model.js";

// Hàm dùng chung: lấy document cấu hình (tự tạo với default nếu chưa có).
// upsert + $setOnInsert: lần đọc đầu tiên tự sinh bản ghi mặc định.
export const getShopSetting = () =>
  Setting.findOneAndUpdate(
    { key: "shop" },
    { $setOnInsert: { key: "shop" } },
    { new: true, upsert: true }
  );

export const getSettings = async (req, res) => {
  const setting = await getShopSetting();
  res.json(setting);
};

export const updateSettings = async (req, res) => {
  // req.body đã qua Zod (chỉ chứa các trường được phép sửa)
  const setting = await Setting.findOneAndUpdate({ key: "shop" }, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  res.json(setting);
};
