// ============================================================
// CART.CONTROLLER.JS - GIỎ HÀNG SERVER-SIDE
// ------------------------------------------------------------
// Luồng dữ liệu của giỏ hàng (quan trọng - đọc kỹ):
//   - DB chỉ lưu THAM CHIẾU: {product, variantId, quantity}.
//   - Khi đọc giỏ (GET), server "làm giàu" (enrich) từng item bằng
//     thông tin MỚI NHẤT từ Product: tên, ảnh, GIÁ HIỆN TẠI, tồn kho.
//     -> Giá trong giỏ không bao giờ lệch giá thật; admin đổi giá
//        thì giỏ của khách tự cập nhật.
//   - Item "mồ côi" (sản phẩm bị ẩn/xóa, biến thể không còn) bị LOẠI
//     khỏi giỏ ngay khi đọc -> khách không đặt nhầm hàng đã ngừng bán.
//
// MERGE GIỎ KHI ĐĂNG NHẬP (POST /merge):
//   Khách chưa đăng nhập bỏ hàng vào giỏ (localStorage). Khi đăng
//   nhập, frontend gửi giỏ local lên; server TRỘN vào giỏ đã có:
//   item trùng (cùng product + variant) thì CỘNG DỒN số lượng.
// ============================================================

import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

// ------------------------------------------------------------
// Hàm phụ: enrich giỏ hàng - trả về items kèm thông tin sản phẩm
// mới nhất, đồng thời DỌN các item không còn hợp lệ trong DB.
// ------------------------------------------------------------
const enrichCart = async (cart) => {
  if (!cart || cart.items.length === 0) return [];

  // Lấy 1 lần tất cả sản phẩm trong giỏ ($in) - tránh N+1 query
  const productIds = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const enriched = [];
  const validItemIds = [];

  for (const item of cart.items) {
    const product = productMap.get(item.product.toString());
    if (!product) continue; // sản phẩm đã ẩn/xóa -> loại

    let variant = null;
    if (item.variantId) {
      variant = product.variants.id(item.variantId);
      if (!variant) continue; // biến thể không còn -> loại
    } else if (product.variants.length > 0) {
      continue; // sản phẩm nay có biến thể mà item cũ không chọn -> loại
    }

    validItemIds.push(item._id.toString());
    enriched.push({
      itemId: item._id,
      productId: product._id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      variantId: variant?._id || null,
      variantName: variant?.name || null,
      price: variant?.price ?? product.price, // GIÁ HIỆN TẠI từ DB
      maxStock: variant?.countInStock ?? product.countInStock,
      quantity: item.quantity,
    });
  }

  // Nếu có item bị loại -> cập nhật DB cho giỏ sạch
  if (validItemIds.length !== cart.items.length) {
    cart.items = cart.items.filter((i) => validItemIds.includes(i._id.toString()));
    await cart.save();
  }

  return enriched;
};

// Hàm phụ: lấy (hoặc tạo mới) giỏ của user hiện tại.
// upsert: true -> chưa có giỏ thì MongoDB tự tạo, tránh race condition
// "2 request cùng lúc cùng tạo giỏ" so với cách find rồi create.
const getOrCreateCart = (userId) =>
  Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },
    { new: true, upsert: true }
  );

// ------------------------------------------------------------
// GET /api/cart - Giỏ của tôi (đã enrich)
// ------------------------------------------------------------
export const getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  res.json(await enrichCart(cart));
};

// ------------------------------------------------------------
// POST /api/cart/items - Thêm sản phẩm vào giỏ
// Body: { product, variantId?, quantity }
// ------------------------------------------------------------
export const addCartItem = async (req, res) => {
  const { product: productId, variantId, quantity } = req.body;

  // Kiểm tra sản phẩm + biến thể có thật (không tin id client gửi)
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) return res.status(404).json({ message: "Sản phẩm không tồn tại" });
  if (product.variants.length > 0) {
    if (!variantId || !product.variants.id(variantId)) {
      return res.status(400).json({ message: "Vui lòng chọn phiên bản hợp lệ" });
    }
  }

  const cart = await getOrCreateCart(req.user._id);

  // Trùng (cùng product + cùng variant) -> cộng dồn số lượng (trần 100)
  const existed = cart.items.find(
    (i) =>
      i.product.toString() === productId &&
      String(i.variantId || "") === String(variantId || "")
  );
  if (existed) {
    existed.quantity = Math.min(100, existed.quantity + quantity);
  } else {
    cart.items.push({ product: productId, variantId, quantity });
  }

  await cart.save();
  res.status(201).json(await enrichCart(cart));
};

// ------------------------------------------------------------
// PUT /api/cart/items/:itemId - Đổi số lượng 1 dòng trong giỏ
// ------------------------------------------------------------
export const updateCartItem = async (req, res) => {
  const { quantity } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart?.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ message: "Không tìm thấy dòng giỏ hàng" });

  item.quantity = quantity;
  await cart.save();
  res.json(await enrichCart(cart));
};

// ------------------------------------------------------------
// DELETE /api/cart/items/:itemId - Xóa 1 dòng
// DELETE /api/cart                - Xóa cả giỏ (sau khi đặt hàng xong)
// ------------------------------------------------------------
export const removeCartItem = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.json([]);
  // .pull(): helper Mongoose xóa sub-document theo _id khỏi mảng
  cart.items.pull(req.params.itemId);
  await cart.save();
  res.json(await enrichCart(cart));
};

export const clearCart = async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  res.json([]);
};

// ------------------------------------------------------------
// POST /api/cart/merge - Trộn giỏ localStorage vào giỏ server
// Gọi 1 lần ngay sau khi đăng nhập (nếu giỏ local có hàng).
// Body: { items: [{ product, variantId?, quantity }] }
// ------------------------------------------------------------
export const mergeCart = async (req, res) => {
  const { items } = req.body;

  const cart = await getOrCreateCart(req.user._id);

  // Xác minh hàng loạt: chỉ nhận sản phẩm có thật + đang bán
  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  for (const local of items) {
    const product = productMap.get(local.product);
    if (!product) continue; // id rác/sản phẩm ẩn -> bỏ qua
    if (product.variants.length > 0 && (!local.variantId || !product.variants.id(local.variantId))) {
      continue; // biến thể không hợp lệ -> bỏ qua
    }

    const existed = cart.items.find(
      (i) =>
        i.product.toString() === local.product &&
        String(i.variantId || "") === String(local.variantId || "")
    );
    if (existed) {
      existed.quantity = Math.min(100, existed.quantity + local.quantity); // CỘNG DỒN
    } else {
      cart.items.push({
        product: local.product,
        variantId: local.variantId,
        quantity: local.quantity,
      });
    }
  }

  await cart.save();
  res.json(await enrichCart(cart));
};
