// ============================================================
// MISC.CONTROLLER.JS - BRAND, BANNER, FEEDBACK, ADDRESS
// ------------------------------------------------------------
// Các controller CRUD ngắn gọn gom 1 file (mỗi cái ~3-4 hàm).
// Pattern lặp lại đã học: public đọc / admin ghi / user sở hữu dữ
// liệu riêng (address) thì luôn filter theo req.user._id (chống IDOR).
// ============================================================

import Brand from "../models/brand.model.js";
import Banner from "../models/banner.model.js";
import Feedback from "../models/feedback.model.js";
import Address from "../models/address.model.js";
import { uniqueSlug } from "../utils/slugify.js";

// ==================== BRAND ====================

// GET /api/brands (public) - hiện ở menu/trang lọc
export const getBrands = async (req, res) => {
  const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
  res.json(brands);
};

// POST /api/brands (admin)
export const createBrand = async (req, res) => {
  const slug = await uniqueSlug(Brand, req.body.name);
  const brand = await Brand.create({ ...req.body, slug });
  res.status(201).json(brand);
};

// PUT /api/brands/:id (admin)
export const updateBrand = async (req, res) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) return res.status(404).json({ message: "Không tìm thấy thương hiệu" });
  if (req.body.name && req.body.name !== brand.name) {
    brand.slug = await uniqueSlug(Brand, req.body.name);
  }
  Object.assign(brand, req.body);
  res.json(await brand.save());
};

// DELETE /api/brands/:id (admin) - ẩn thay vì xóa (sản phẩm còn tham chiếu tên)
export const deleteBrand = async (req, res) => {
  const brand = await Brand.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!brand) return res.status(404).json({ message: "Không tìm thấy thương hiệu" });
  res.json({ message: "Đã ẩn thương hiệu" });
};

// ==================== BANNER ====================

// GET /api/banners (public) - trang chủ lấy banner đang bật
export const getActiveBanners = async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
  res.json(banners);
};

// GET /api/banners/all (admin) - xem cả banner đã tắt
export const getAllBanners = async (req, res) => {
  const banners = await Banner.find().sort({ order: 1, createdAt: -1 });
  res.json(banners);
};

export const createBanner = async (req, res) => {
  const banner = await Banner.create(req.body);
  res.status(201).json(banner);
};

export const updateBanner = async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });
  res.json(banner);
};

export const deleteBanner = async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });
  res.json({ message: "Đã xóa banner" });
};

// ==================== FEEDBACK ====================

// POST /api/feedback (PUBLIC - đã qua rate limit + Zod ở route)
export const createFeedback = async (req, res) => {
  const data = { ...req.body };
  // Nếu người gửi đang đăng nhập (cookie hợp lệ) thì gắn user.
  // req.user chỉ tồn tại khi đi qua protectRoute - route này public
  // nên không có; ta vẫn để sẵn logic phòng khi gắn middleware sau này.
  if (req.user) data.user = req.user._id;
  await Feedback.create(data);
  res.status(201).json({
    message: "Cảm ơn bạn đã góp ý! Chúng tôi sẽ phản hồi qua email sớm nhất.",
  });
};

// GET /api/feedback (admin) - mới nhất trước
export const getFeedbacks = async (req, res) => {
  const feedbacks = await Feedback.find().sort({ isResolved: 1, createdAt: -1 });
  res.json(feedbacks);
};

// PUT /api/feedback/:id/resolve (admin) - đánh dấu đã xử lý
export const resolveFeedback = async (req, res) => {
  const fb = await Feedback.findByIdAndUpdate(req.params.id, { isResolved: true }, { new: true });
  if (!fb) return res.status(404).json({ message: "Không tìm thấy phản hồi" });
  res.json(fb);
};

// ==================== ADDRESS (sổ địa chỉ của user) ====================

// GET /api/addresses - địa chỉ CỦA TÔI (mặc định lên đầu)
export const getMyAddresses = async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  res.json(addresses);
};

// POST /api/addresses
export const createAddress = async (req, res) => {
  // Giới hạn 5 địa chỉ/người - chống spam dữ liệu
  const count = await Address.countDocuments({ user: req.user._id });
  if (count >= 5) {
    return res.status(400).json({ message: "Tối đa 5 địa chỉ. Hãy xóa bớt địa chỉ cũ." });
  }
  // Nếu đặt làm mặc định -> bỏ cờ mặc định ở các địa chỉ khác
  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const address = await Address.create({ ...req.body, user: req.user._id });
  res.status(201).json(address);
};

// PUT /api/addresses/:id - CHỐNG IDOR: filter kèm user từ token
export const updateAddress = async (req, res) => {
  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id }, // phải là CỦA TÔI
    req.body,
    { new: true, runValidators: true }
  );
  if (!address) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
  res.json(address);
};

// DELETE /api/addresses/:id
export const deleteAddress = async (req, res) => {
  const address = await Address.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id, // chống IDOR
  });
  if (!address) return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
  res.json({ message: "Đã xóa địa chỉ" });
};
