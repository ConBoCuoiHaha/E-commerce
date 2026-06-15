// ============================================================
// PAGE.CONTROLLER.JS - BÀI VIẾT "THÔNG TIN HỮU ÍCH" (CMS thu nhỏ)
// ============================================================

import Page from "../models/page.model.js";
import { uniqueSlug } from "../utils/slugify.js";

// GET /api/pages (public) - danh sách cho footer (chỉ slug + title)
export const getPages = async (req, res) => {
  const pages = await Page.find({ isActive: true })
    .select("slug title order")
    .sort({ order: 1 });
  res.json(pages);
};

// GET /api/pages/all (admin) - đầy đủ kể cả bài đã ẩn
export const getAllPages = async (req, res) => {
  const pages = await Page.find().sort({ order: 1 });
  res.json(pages);
};

// GET /api/pages/:slug (public) - nội dung 1 bài
export const getPageBySlug = async (req, res) => {
  const page = await Page.findOne({ slug: req.params.slug, isActive: true });
  if (!page) return res.status(404).json({ message: "Không tìm thấy bài viết" });
  res.json(page);
};

// POST /api/pages (admin)
export const createPage = async (req, res) => {
  const slug = await uniqueSlug(Page, req.body.title);
  const page = await Page.create({ ...req.body, slug });
  res.status(201).json(page);
};

// PUT /api/pages/:id (admin) - sửa nội dung/tiêu đề/thứ tự
export const updatePage = async (req, res) => {
  const page = await Page.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!page) return res.status(404).json({ message: "Không tìm thấy bài viết" });
  res.json(page);
};

// DELETE /api/pages/:id (admin)
export const deletePage = async (req, res) => {
  const page = await Page.findByIdAndDelete(req.params.id);
  if (!page) return res.status(404).json({ message: "Không tìm thấy bài viết" });
  res.json({ message: "Đã xóa bài viết" });
};
