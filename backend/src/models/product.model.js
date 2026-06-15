// ============================================================
// PRODUCT.MODEL.JS - MODEL SẢN PHẨM (web HungSaiGon)
// ------------------------------------------------------------
// Đây là model phức tạp nhất, thiết kế để phục vụ 2 tính năng nâng cao:
//
// 1. LỌC FACETED (bộ lọc nâng cao như ThinkPro):
//    -> dùng trường `attributes` chứa các thuộc tính DÙNG ĐỂ LỌC
//       (brand, cpu, ram, screenSize...). Tách riêng khỏi mô tả text
//       để query/đếm theo từng nhánh filter dễ dàng.
//
// 2. BIẾN THỂ SẢN PHẨM (variants):
//    -> 1 laptop có nhiều cấu hình (16GB/512GB, 32GB/1TB...), mỗi cấu
//       hình GIÁ và TỒN KHO khác nhau. Lưu thành mảng `variants`.
//    -> `price` và `countInStock` ở cấp Product là của biến thể RẺ NHẤT
//       / tổng kho, dùng để HIỂN THỊ nhanh ở danh sách ("từ 25.990.000đ").
//       Giá thật khi đặt hàng lấy theo variant người dùng chọn.
// ============================================================

import mongoose from "mongoose";

// LƯU Ý (refactor v4): review KHÔNG còn nhúng ở đây nữa - đã tách
// sang collection riêng (review.model.js) để phân trang được và
// tránh document phình to. Product chỉ giữ 2 số liệu tổng hợp
// rating + numReviews (tính lại bằng aggregation khi có review mới).

// ----- Schema con: BIẾN THỂ (variant) -----
const variantSchema = new mongoose.Schema({
  // Tên hiển thị của cấu hình, vd: "16GB RAM / 512GB SSD - Bạc"
  name: { type: String, required: true, trim: true },
  // SKU: mã định danh kho duy nhất cho từng biến thể (Stock Keeping Unit)
  sku: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  countInStock: { type: Number, required: true, min: 0, default: 0 },
  // Các thông tin riêng của biến thể để hiển thị/so sánh (tùy chọn)
  ram: { type: String },
  storage: { type: String },
  color: { type: String },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      trim: true,
      maxlength: [250, "Tên sản phẩm tối đa 250 ký tự"],
    },
    slug: { type: String, unique: true, lowercase: true },
    description: {
      type: String,
      required: [true, "Mô tả sản phẩm là bắt buộc"],
      maxlength: [5000, "Mô tả tối đa 5000 ký tự"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Sản phẩm phải thuộc một danh mục"],
    },

    // --- Giá & kho cấp sản phẩm (để hiển thị nhanh ở danh sách) ---
    // price = giá biến thể rẻ nhất; countInStock = tổng kho các biến thể.
    // Khi seed/cập nhật, ta tính lại 2 trường này từ variants.
    price: { type: Number, required: true, min: 0 },
    countInStock: { type: Number, required: true, min: 0, default: 0 },
    // Giá gốc (chưa giảm) - để hiển thị giá gạch ngang + % giảm như ThinkPro
    originalPrice: { type: Number, min: 0 },

    // Ảnh: 1 ảnh đại diện + mảng ảnh phụ (gallery)
    image: { type: String, default: "https://placehold.co/600x400?text=No+Image" },
    images: [{ type: String }],

    // --- ATTRIBUTES: các thuộc tính DÙNG ĐỂ LỌC FACETED ---
    // Để dạng object lồng (không phải Map) để query thuận tiện:
    //   filter["attributes.brand"] = "Lenovo"
    // Tùy danh mục mà điền các trường liên quan (laptop có cpu/gpu,
    // ổ cứng có capacity...). Trường nào không có thì bỏ trống.
    attributes: {
      brand: { type: String }, // Lenovo, Dell, Apple... (index khai báo ở dưới)
      cpu: { type: String }, // "Intel Core i5", "Apple M3", "AMD Ryzen 7"
      gpu: { type: String }, // "NVIDIA RTX 4060", "Onboard"
      ram: { type: String }, // "16GB", "32GB"
      storage: { type: String }, // "512GB SSD", "1TB SSD"
      screenSize: { type: Number }, // theo inch: 13.3, 14, 15.6...
      // "nhu cầu" sử dụng (đa giá trị): ["gaming", "vanphong", "dohoa"...]
      needs: [{ type: String }],
    },

    // --- Biến thể ---
    variants: [variantSchema],

    // --- BẢNG THÔNG SỐ CHI TIẾT (v5) ---
    // Khác với `attributes` (ít trường, chuẩn hóa, DÙNG ĐỂ LỌC),
    // `specifications` là bảng dài hiển thị ở trang chi tiết
    // (pin, cổng kết nối, trọng lượng, hệ điều hành...) - tự do
    // theo từng sản phẩm, không dùng để query.
    specifications: [
      {
        label: { type: String, required: true, trim: true, maxlength: 80 },
        value: { type: String, required: true, trim: true, maxlength: 300 },
      },
    ],

    // --- Đánh giá (số liệu tổng hợp - chi tiết nằm ở collection Review) ---
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },

    // Sản phẩm nổi bật (hiện ở trang chủ)
    isFeatured: { type: Boolean, default: false },
    // Soft delete: admin ẩn thay vì xóa (đơn hàng cũ còn tham chiếu)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// --- INDEX phục vụ tìm kiếm & lọc nhanh ---
// Text index trên name để tìm kiếm; index trên các trường lọc hay dùng.
productSchema.index({ name: "text" });
productSchema.index({ category: 1 });
productSchema.index({ "attributes.brand": 1 });
productSchema.index({ price: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
