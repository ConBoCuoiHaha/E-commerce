// ============================================================
// CATEGORY.CONTROLLER.JS - CRUD DANH MỤC
// ------------------------------------------------------------
// CRUD = Create / Read / Update / Delete.
// Quyền hạn (đã chặn ở route):
//   - Xem danh mục: ai cũng được (public)
//   - Tạo / sửa / xóa: chỉ admin
// ============================================================

import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import { uniqueSlug } from "../utils/slugify.js";

// GET /api/categories - Lấy tất cả danh mục (public)
export const getCategories = async (req, res) => {
  // Sắp theo trường "order" (thứ tự menu admin định nghĩa), cùng order thì theo tên
  const categories = await Category.find().sort({ order: 1, name: 1 });
  res.json(categories);
};

// POST /api/categories - Tạo danh mục (admin)
export const createCategory = async (req, res) => {
  const { name, description } = req.body;

  // Sinh slug từ tên, đảm bảo không trùng
  const slug = await uniqueSlug(Category, name);

  const category = await Category.create({ name, description, slug });
  res.status(201).json(category);
};

// PUT /api/categories/:id - Cập nhật danh mục (admin)
export const updateCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: "Không tìm thấy danh mục" });
  }

  const { name, description } = req.body;
  if (name && name !== category.name) {
    category.name = name;
    // Đổi tên thì sinh lại slug cho khớp
    category.slug = await uniqueSlug(Category, name);
  }
  if (description !== undefined) category.description = description;

  const updated = await category.save();
  res.json(updated);
};

// DELETE /api/categories/:id - Xóa danh mục (admin)
export const deleteCategory = async (req, res) => {
  // RÀNG BUỘC DỮ LIỆU: không cho xóa danh mục đang có sản phẩm,
  // nếu không các sản phẩm đó sẽ trỏ tới danh mục "ma" (orphan).
  const productCount = await Product.countDocuments({ category: req.params.id });
  if (productCount > 0) {
    return res.status(400).json({
      message: `Không thể xóa: còn ${productCount} sản phẩm thuộc danh mục này`,
    });
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return res.status(404).json({ message: "Không tìm thấy danh mục" });
  }
  res.json({ message: "Đã xóa danh mục" });
};
