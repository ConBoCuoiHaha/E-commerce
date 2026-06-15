// ============================================================
// WISHLIST.CONTROLLER.JS - YÊU THÍCH (refactor v4: collection riêng)
// ------------------------------------------------------------
// Thay đổi so với bản cũ (mảng nhúng trong User):
//   - Mỗi lượt thích = 1 document {user, product, createdAt}
//   - Chống trùng bằng COMPOUND UNIQUE INDEX (user+product) ở tầng DB
//     (vai trò $addToSet cũ) - bắt lỗi 11000 thay vì kiểm tra trước
//     (kiểm-tra-rồi-mới-ghi có race condition, ràng buộc DB thì không)
// API giữ NGUYÊN hình dạng (đường dẫn + kiểu dữ liệu trả về)
// -> frontend WishlistContext không phải đổi gì cả. Đây là điểm hay
// của việc tách tầng: đổi cách LƯU mà không đổi GIAO KÈO (contract).
// ============================================================

import Wishlist from "../models/wishlist.model.js";
import Product from "../models/product.model.js";

// GET /api/wishlist - Danh sách yêu thích của tôi (thích gần đây trước)
export const getWishlist = async (req, res) => {
  const entries = await Wishlist.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: "product",
      match: { isActive: true }, // sản phẩm đã ẩn -> populate trả null
      populate: { path: "category", select: "name slug" },
    });

  // Trả về MẢNG SẢN PHẨM (giữ nguyên contract cũ), lọc bỏ null
  res.json(entries.map((e) => e.product).filter(Boolean));
};

// POST /api/wishlist/:productId - Thêm vào yêu thích
export const addToWishlist = async (req, res) => {
  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  try {
    await Wishlist.create({ user: req.user._id, product: product._id });
  } catch (err) {
    // 11000 = đã thích rồi (unique index chặn) -> coi như thành công,
    // thao tác "thích" có tính idempotent (lặp lại không đổi kết quả)
    if (err.code !== 11000) throw err;
  }
  res.json({ message: "Đã thêm vào danh sách yêu thích" });
};

// DELETE /api/wishlist/:productId - Bỏ yêu thích
export const removeFromWishlist = async (req, res) => {
  await Wishlist.deleteOne({ user: req.user._id, product: req.params.productId });
  res.json({ message: "Đã xóa khỏi danh sách yêu thích" });
};
