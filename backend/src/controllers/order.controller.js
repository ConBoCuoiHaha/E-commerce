// ============================================================
// ORDER.CONTROLLER.JS - XỬ LÝ ĐƠN HÀNG (theo BIẾN THỂ)
// ------------------------------------------------------------
// FILE QUAN TRỌNG NHẤT VỀ BẢO MẬT NGHIỆP VỤ. Các bài học:
//
// 1. KHÔNG TIN GIÁ TỪ CLIENT: client chỉ gửi {product, variantId,
//    quantity}. Giá lấy từ DB theo ĐÚNG BIẾN THỂ người dùng chọn.
//
// 2. TRỪ KHO NGUYÊN TỬ Ở CẤP BIẾN THỂ (chống oversell):
//    Mỗi biến thể có tồn kho riêng. Lệnh trừ kho dùng $elemMatch để
//    "tìm + kiểm tra đủ hàng + trừ" trong CÙNG MỘT thao tác:
//      findOneAndUpdate(
//        { _id, variants: { $elemMatch: { _id: variantId,
//                                          countInStock: { $gte: qty } } } },
//        { $inc: { "variants.$.countInStock": -qty, countInStock: -qty } }
//      )
//    - "variants.$" = phần tử mảng ĐẦU TIÊN khớp điều kiện $elemMatch
//    - đồng thời trừ luôn countInStock tổng ở cấp Product (để danh
//      sách hiển thị còn hàng/hết hàng đúng mà không phải tính lại)
//    -> 2 người mua cùng lúc không thể cùng vượt qua bước kiểm tra.
//
// 3. CHỐNG IDOR: user chỉ xem/hủy được đơn CỦA MÌNH (so sánh với
//    req.user._id lấy từ token, không bao giờ từ body).
//
// 4. EMAIL THÔNG BÁO: đơn mới -> gửi email về hộp thư admin.
//    Lỗi email KHÔNG được làm hỏng việc đặt hàng -> .catch() chỉ log.
// ============================================================

import crypto from "crypto";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Coupon from "../models/coupon.model.js";
import { checkCoupon } from "./coupon.controller.js";
import {
  sendNewOrderNotification,
  sendPaymentConfirmedEmail,
  sendInvoiceEmail,
} from "../utils/sendEmail.js";
import { buildInvoicePdf } from "../utils/invoicePdf.js";
import { consumeFifo, restoreFifo, getCategoryConfig } from "../utils/costing.js";
import { getOrCreateAccountingSetting } from "./accounting.controller.js";
import { computeMembershipDiscount, tierFromSpending } from "../utils/membership.js";
import SystemLog from "../models/systemLog.model.js";
import User from "../models/user.model.js";

// Phí ship: miễn phí cho đơn >= 500k
const SHIPPING_FEE = 30000;
const FREE_SHIPPING_THRESHOLD = 500000;

// ------------------------------------------------------------
// XUẤT KHO + KẾT CHUYỂN GIÁ VỐN bằng FIFO (v10-P2).
// Gọi khi đơn chuyển sang "shipping". Với mỗi dòng hàng:
//   - Tra danh mục sản phẩm -> lấy tỷ lệ chi phí lưu kho h
//   - consumeFifo: trừ tồn lô cũ nhất trước, tính giá vốn C0 + Ceff
//   - Lưu giá vốn + các lô đã trừ (fifoLayers) lên orderItem
// Tổng cogsCeff của đơn = giá vốn hàng bán -> báo cáo lợi nhuận gộp thật.
// ------------------------------------------------------------
const applyFifoCosting = async (order, userId) => {
  const setting = await getOrCreateAccountingSetting();
  let cogsC0 = 0;
  let cogsCeff = 0;

  for (const item of order.orderItems) {
    // Lấy slug danh mục của sản phẩm để biết tỷ lệ lưu kho
    const product = await Product.findById(item.product).populate("category", "slug");
    const slug = product?.category?.slug;
    const { carryingRatePct } = getCategoryConfig(setting, slug);

    const result = await consumeFifo(item.product, item.variantId, item.quantity, carryingRatePct);
    item.costC0 = result.cogsC0;
    item.costCeff = result.cogsCeff;
    item.fifoLayers = result.layers;
    cogsC0 += result.cogsC0;
    cogsCeff += result.cogsCeff;

    // Thiếu lô phủ (hàng chưa có dữ liệu giá vốn) -> log cảnh báo cho kế toán
    if (result.shortage > 0) {
      await SystemLog.create({
        action: "STOCK_OUT_SHORTAGE",
        description: `Đơn ${order._id}: "${item.name}" thiếu ${result.shortage} đơn vị có dữ liệu lô (giá vốn ước tính thiếu)`,
        refId: order._id,
      });
    }
  }

  order.cogsC0 = cogsC0;
  order.cogsCeff = cogsCeff;
  order.costedAt = new Date();

  await SystemLog.create({
    action: "STOCK_OUT_FIFO",
    description: `Xuất kho đơn ${order._id}: giá vốn hiệu dụng ${cogsCeff.toLocaleString("vi-VN")}đ`,
    user: userId,
    refId: order._id,
    meta: { cogsC0, cogsCeff },
  });
};

// ------------------------------------------------------------
// Hàm phụ: HOÀN LẠI LƯỢT COUPON khi đơn bị hủy (audit v9).
// LỖI ẨN ĐÃ SỬA: trước đây hủy đơn chỉ hoàn KHO, lượt mã giảm giá
// thì mất luôn -> mã 100 lượt bị "ăn mòn" bởi các đơn hủy, khách
// thật hết mã để dùng. Hoàn nguyên tử bằng $inc -1 (có điều kiện
// usedCount > 0 để không bao giờ âm).
// ------------------------------------------------------------
const refundCouponUse = async (order) => {
  if (!order.couponCode) return;
  await Coupon.updateOne(
    { code: order.couponCode, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } }
  );
};

// ------------------------------------------------------------
// Hàm phụ: HOÀN KHO cho 1 orderItem (dùng khi rollback / hủy đơn).
// Nếu item có variantId -> cộng lại kho biến thể + kho tổng;
// nếu không -> chỉ cộng kho tổng.
// ------------------------------------------------------------
const restockItem = async (item) => {
  if (item.variantId) {
    await Product.updateOne(
      { _id: item.product, "variants._id": item.variantId },
      {
        $inc: {
          "variants.$.countInStock": item.quantity,
          countInStock: item.quantity,
        },
      }
    );
  } else {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { countInStock: item.quantity } }
    );
  }
};

// ------------------------------------------------------------
// POST /api/orders - Tạo đơn hàng (user đã đăng nhập)
// ------------------------------------------------------------
export const createOrder = async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod, couponCode } = req.body;

  // ---------- BƯỚC 1: Lấy thông tin THẬT của sản phẩm từ DB ----------
  const productIds = orderItems.map((i) => i.product);
  const productsInDb = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  }).populate("category", "slug"); // cần slug để tra ma trận chiết khấu
  const productMap = new Map(productsInDb.map((p) => [p._id.toString(), p]));
  // Map product -> categorySlug để tính chiết khấu membership (v10-P3)
  const catSlugMap = new Map(
    productsInDb.map((p) => [p._id.toString(), p.category?.slug])
  );

  // ---------- BƯỚC 2: Dựng orderItems từ DB (KHÔNG tin client) ----------
  const finalItems = [];
  for (const item of orderItems) {
    const product = productMap.get(item.product);
    if (!product) {
      return res
        .status(400)
        .json({ message: "Có sản phẩm không tồn tại hoặc đã ngừng bán" });
    }

    if (product.variants.length > 0) {
      // Sản phẩm CÓ biến thể -> client BẮT BUỘC phải chọn 1 biến thể
      if (!item.variantId) {
        return res.status(400).json({
          message: `Vui lòng chọn phiên bản cho sản phẩm "${product.name}"`,
        });
      }
      // .id() là helper của Mongoose: tìm sub-document theo _id trong mảng
      const variant = product.variants.id(item.variantId);
      if (!variant) {
        return res.status(400).json({
          message: `Phiên bản không hợp lệ cho sản phẩm "${product.name}"`,
        });
      }
      finalItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        variantId: variant._id,
        variantName: variant.name, // snapshot tên biến thể
        price: variant.price, // GIÁ THEO BIẾN THỂ TỪ DB - không tin client!
        quantity: item.quantity,
      });
    } else {
      // Sản phẩm KHÔNG có biến thể -> dùng giá cấp product
      finalItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: item.quantity,
      });
    }
  }

  // ---------- BƯỚC 3: Trừ kho NGUYÊN TỬ từng item (chống oversell) ----------
  const decremented = []; // các item đã trừ thành công - để rollback nếu lỗi
  for (const item of finalItems) {
    let updated;
    if (item.variantId) {
      // Trừ kho Ở CẤP BIẾN THỂ: điều kiện "biến thể này còn đủ hàng"
      // và lệnh trừ nằm trong cùng 1 thao tác (atomic).
      updated = await Product.findOneAndUpdate(
        {
          _id: item.product,
          variants: {
            $elemMatch: { _id: item.variantId, countInStock: { $gte: item.quantity } },
          },
        },
        {
          $inc: {
            "variants.$.countInStock": -item.quantity, // kho biến thể
            countInStock: -item.quantity, // kho tổng (hiển thị)
          },
        },
        { new: true }
      );
    } else {
      updated = await Product.findOneAndUpdate(
        { _id: item.product, countInStock: { $gte: item.quantity } },
        { $inc: { countInStock: -item.quantity } },
        { new: true }
      );
    }

    if (!updated) {
      // Kho không đủ -> HOÀN LẠI các item đã trừ trước đó (rollback thủ công).
      // Production thực tế: dùng MongoDB Transaction (cần replica set).
      for (const done of decremented) await restockItem(done);
      const label = item.variantName ? `${item.name} (${item.variantName})` : item.name;
      return res
        .status(400)
        .json({ message: `Sản phẩm "${label}" không đủ hàng trong kho` });
    }
    decremented.push(item);
  }

  // ---------- BƯỚC 4: Server TỰ TÍNH tiền ----------
  const itemsPrice = finalItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingPrice = itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  // ---------- BƯỚC 4b: Áp mã giảm giá (nếu có) ----------
  // Dù client đã "kiểm tra mã" ở giỏ hàng, server vẫn KIỂM TRA LẠI
  // tại thời điểm đặt (mã có thể vừa hết hạn/hết lượt trong lúc đó).
  // THỨ TỰ ĐÚNG (bài học từ bug thật):
  //   (1) KIỂM TRA điều kiện trên bản gốc -> (2) TRỪ LƯỢT nguyên tử.
  // Bug cũ: trừ lượt trước rồi mới gọi checkCoupon trên document ĐÃ
  // TĂNG usedCount -> mã 2 lượt bị từ chối oan ngay lượt thứ 2
  // (usedCount vừa thành 2, check "2 >= 2" tưởng là hết lượt).
  let discountPrice = 0;
  let appliedCoupon = null;
  if (couponCode) {
    // (1) Đọc mã + kiểm tra mọi điều kiện (hạn, lượt, đơn tối thiểu)
    //     trên giá trị HIỆN TẠI. Tiền giảm tính từ đây.
    const coupon = await Coupon.findOne({ code: couponCode });
    const result = checkCoupon(coupon, itemsPrice);
    if (!result.valid) {
      for (const done of decremented) await restockItem(done); // hoàn kho đã trừ
      return res.status(400).json({ message: result.message });
    }

    // (2) TRỪ LƯỢT NGUYÊN TỬ: điều kiện "còn lượt" + $inc nằm trong
    //     CÙNG 1 lệnh -> 2 người giành lượt cuối cùng lúc thì chỉ 1
    //     người thành công (chống race condition, giống chống oversell).
    //     $expr cho phép so sánh 2 TRƯỜNG với nhau (usedCount < usageLimit).
    appliedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: coupon._id,
        isActive: true,
        expiresAt: { $gt: new Date() },
        $expr: { $lt: ["$usedCount", "$usageLimit"] },
      },
      { $inc: { usedCount: 1 } },
      { new: true }
    );
    if (!appliedCoupon) {
      // Ai đó vừa lấy mất lượt cuối trong tích tắc giữa (1) và (2)
      for (const done of decremented) await restockItem(done);
      return res.status(400).json({ message: "Mã giảm giá vừa hết lượt sử dụng" });
    }

    discountPrice = result.discount;
  }

  // ---------- BƯỚC 4c: Chiết khấu MEMBERSHIP (HSSV/VIP) - v10-P3 ----------
  // Tự áp theo hạng của khách (lấy mức lợi nhất giữa HSSV và VIP, có cap).
  // Lấy bản user mới nhất từ DB để chắc studentStatus/vipTier đúng hiện tại.
  const setting = await getOrCreateAccountingSetting();
  const buyer = await User.findById(req.user._id);
  const membershipItems = finalItems.map((i) => ({
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    categorySlug: catSlugMap.get(i.product.toString()),
  }));
  const membership = computeMembershipDiscount(buyer, membershipItems, setting);
  const membershipDiscount = membership.total;

  // Tổng = tiền hàng + ship − chiết khấu membership − mã giảm giá (sàn 0)
  const totalPrice = Math.max(
    0,
    itemsPrice + shippingPrice - membershipDiscount - discountPrice
  );

  // ---------- BƯỚC 5: Lưu đơn ----------
  // Đơn CHUYỂN KHOẢN: sinh mã thanh toán "HSG" + 6 chữ số NGẪU NHIÊN
  // (crypto.randomInt - nguồn ngẫu nhiên an toàn, không dùng Math.random
  // cho thứ liên quan đến tiền). Khách ghi mã này vào nội dung CK.
  const paymentCode =
    paymentMethod === "banking"
      ? `HSG${crypto.randomInt(100000, 1000000)}`
      : undefined;

  const order = await Order.create({
    user: req.user._id, // chủ đơn lấy từ TOKEN, không từ body
    orderItems: finalItems,
    shippingAddress,
    paymentMethod,
    paymentCode,
    itemsPrice,
    shippingPrice,
    couponCode: appliedCoupon ? appliedCoupon.code : undefined,
    discountPrice,
    membershipDiscount,
    membershipTier: membership.appliedTier,
    totalPrice,
  });

  // ---------- BƯỚC 6: Email thông báo cho admin (không chặn response) ----------
  // Cố tình KHÔNG await: gửi email chạy nền, đặt hàng trả kết quả ngay.
  // .catch chỉ log - email lỗi không được làm hỏng đơn hàng.
  sendNewOrderNotification(order, req.user).catch((err) =>
    console.error("⚠️ Gửi email thông báo đơn hàng thất bại:", err.message)
  );

  res.status(201).json(order);
};

// ------------------------------------------------------------
// GET /api/orders/my - Đơn hàng CỦA TÔI
// ------------------------------------------------------------
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
};

// ------------------------------------------------------------
// GET /api/orders/:id - Chi tiết 1 đơn (chủ đơn hoặc admin) - chống IDOR
// ------------------------------------------------------------
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

  const isOwner = order.user._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Bạn không có quyền xem đơn hàng này" });
  }
  res.json(order);
};

// ------------------------------------------------------------
// PUT /api/orders/:id/cancel - User hủy đơn của mình (chỉ khi pending)
// ------------------------------------------------------------
export const cancelMyOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này" });
  }
  if (order.status !== "pending") {
    return res.status(400).json({ message: "Chỉ hủy được đơn đang chờ xác nhận" });
  }
  // LỖI ẨN ĐÃ SỬA (audit v9): đơn ĐÃ THANH TOÁN mà khách tự hủy thì
  // tiền shop đã nhận bị "treo" không có luồng hoàn -> bắt buộc liên
  // hệ shop để hoàn tiền thủ công thay vì tự hủy.
  if (order.isPaid) {
    return res.status(400).json({
      message: "Đơn đã thanh toán - vui lòng liên hệ hotline để được hỗ trợ hủy và hoàn tiền",
    });
  }

  order.status = "cancelled";
  await order.save();

  // Hoàn kho đúng từng biến thể + hoàn lượt mã giảm giá (audit v9)
  for (const item of order.orderItems) await restockItem(item);
  await refundCouponUse(order);

  res.json({ message: "Đã hủy đơn hàng", order });
};

// ------------------------------------------------------------
// GET /api/orders - Tất cả đơn (admin, phân trang)
// ------------------------------------------------------------
export const getAllOrders = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  // Bộ lọc cho "thanh quản lý nhanh" trên trang admin (v7):
  //   ?status=pending|confirmed|shipping|delivered|cancelled (whitelist)
  //   ?status=unpaid -> đơn chuyển khoản CHƯA thanh toán (cần đối soát)
  const filter = {};
  const VALID_STATUS = ["pending", "confirmed", "shipping", "delivered", "cancelled"];
  if (req.query.status === "unpaid") {
    filter.paymentMethod = "banking";
    filter.isPaid = false;
    filter.status = { $ne: "cancelled" };
  } else if (VALID_STATUS.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [totalOrders, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate("user", "name username email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({ orders, page, totalPages: Math.ceil(totalOrders / limit), totalOrders });
};

// ------------------------------------------------------------
// XÁC NHẬN THANH TOÁN - hàm dùng chung cho 2 đường:
//   1. Admin bấm "Xác nhận đã nhận tiền" (thủ công)
//   2. bankMailWatcher đối soát email ngân hàng (tự động)
// Đánh dấu nguyên tử: điều kiện isPaid:false nằm trong cùng lệnh
// update -> gọi 2 lần (email + admin cùng lúc) chỉ 1 lần có hiệu lực.
// ------------------------------------------------------------
export const markOrderPaid = async (orderId, source = "manual") => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, isPaid: false, status: { $ne: "cancelled" } },
    { isPaid: true, paidAt: new Date() },
    { new: true }
  ).populate("user", "name email");

  if (!order) return null; // đã thanh toán rồi / đơn hủy / không tồn tại

  // Báo cho KHÁCH: "đã nhận thanh toán, đơn sẽ được giao tới địa chỉ..."
  sendPaymentConfirmedEmail(order, order.user).catch((err) =>
    console.error("⚠️ Gửi email xác nhận thanh toán thất bại:", err.message)
  );
  console.log(`💰 Đơn ${order._id} đã thanh toán (nguồn: ${source})`);
  return order;
};

// ------------------------------------------------------------
// PUT /api/orders/:id/confirm-payment - Admin xác nhận đã nhận tiền
// (đường thủ công - dự phòng khi đối soát tự động không bắt được)
// ------------------------------------------------------------
export const confirmPayment = async (req, res) => {
  const order = await markOrderPaid(req.params.id, "admin xác nhận tay");
  if (!order) {
    return res
      .status(400)
      .json({ message: "Đơn không tồn tại, đã thanh toán rồi hoặc đã hủy" });
  }
  res.json(order);
};

// ------------------------------------------------------------
// POST /api/orders/:id/invoice - GỬI HÓA ĐƠN PDF cho khách (admin) - v9
// Luồng: dựng PDF trong RAM (Buffer) -> đính kèm email gửi tới email
// tài khoản của khách -> ghi nhận invoiceSentAt.
// Khác các email "phụ" (thông báo): đây là HÀNH ĐỘNG CHÍNH của API
// -> phải await và trả lỗi thật nếu gửi thất bại (admin cần biết).
// ------------------------------------------------------------
export const sendInvoice = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
  if (order.status === "cancelled") {
    return res.status(400).json({ message: "Đơn đã hủy - không xuất hóa đơn" });
  }

  const pdfBuffer = await buildInvoicePdf(order, order.user);
  await sendInvoiceEmail(order, order.user, pdfBuffer);

  order.invoiceSentAt = new Date();
  await order.save();

  res.json({
    message: `Đã gửi hóa đơn PDF tới ${order.user.email}`,
    invoiceSentAt: order.invoiceSentAt,
  });
};

// ------------------------------------------------------------
// GET /api/orders/stats/summary - THỐNG KÊ cho dashboard admin (Phase 4)
// Dùng aggregation để tính trên server DB (nhanh hơn nhiều so với
// kéo hết đơn hàng về Node rồi tự cộng).
// ------------------------------------------------------------
export const getOrderStats = async (req, res) => {
  const [revenueAgg, statusAgg, totalUsers, totalProducts, unresolvedFeedback, unpaidBanking] =
    await Promise.all([
      // Tổng doanh thu: cộng totalPrice các đơn KHÔNG bị hủy
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, revenue: { $sum: "$totalPrice" }, count: { $sum: 1 } } },
      ]),
      // Đếm số đơn theo từng trạng thái
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      // import động tránh vòng lặp import (order <-> user không cần thiết)
      (await import("../models/user.model.js")).default.countDocuments({ role: "user" }),
      Product.countDocuments({ isActive: true }),
      // Số phản hồi CHƯA XỬ LÝ + số đơn chuyển khoản CHƯA THANH TOÁN
      // -> nguồn dữ liệu cho BADGE THÔNG BÁO ĐỎ trên sidebar admin (v7)
      (await import("../models/feedback.model.js")).default.countDocuments({ isResolved: false }),
      Order.countDocuments({ paymentMethod: "banking", isPaid: false, status: { $ne: "cancelled" } }),
    ]);

  res.json({
    revenue: revenueAgg[0]?.revenue || 0,
    totalOrders: revenueAgg[0]?.count || 0,
    ordersByStatus: Object.fromEntries(statusAgg.map((s) => [s._id, s.count])),
    totalUsers,
    totalProducts,
    unresolvedFeedback,
    unpaidBanking,
  });
};

// ------------------------------------------------------------
// PUT /api/orders/:id/status - Admin cập nhật trạng thái (state machine)
// ------------------------------------------------------------
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

  // Luồng trạng thái hợp lệ - tránh đơn "delivered" quay về "pending"
  const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  if (!allowedTransitions[order.status].includes(status)) {
    return res
      .status(400)
      .json({ message: `Không thể chuyển từ "${order.status}" sang "${status}"` });
  }

  // Admin hủy đơn -> hoàn kho đúng biến thể + hoàn lượt coupon (audit v9)
  if (status === "cancelled") {
    for (const item of order.orderItems) await restockItem(item);
    await refundCouponUse(order);
    // Nếu đơn ĐÃ xuất kho (đã tính giá vốn) thì hoàn lại tồn các lô FIFO
    if (order.costedAt) {
      for (const item of order.orderItems) await restoreFifo(item.fifoLayers);
    }
  }

  // XUẤT KHO (v10-P2): khi chuyển sang "shipping" -> tính GIÁ VỐN bằng
  // FIFO + kết chuyển vào giá vốn hàng bán. costedAt chống tính 2 lần.
  if (status === "shipping" && !order.costedAt) {
    await applyFifoCosting(order, req.user._id);
  }

  order.status = status;
  if (status === "delivered") {
    order.deliveredAt = new Date();
    // COD: khách trả tiền lúc nhận hàng -> giao thành công = đã thanh toán
    if (order.paymentMethod === "cod" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
    // TÍCH LŨY CHI TIÊU + NÂNG HẠNG VIP (v10-P3): chỉ cộng 1 lần khi
    // đơn giao thành công. order.deliveredAt ở trên vừa được set nên
    // dùng cờ riêng "spendingCounted" sẽ an toàn hơn - nhưng do luồng
    // trạng thái 1 chiều (chỉ shipping->delivered), mỗi đơn chỉ tới đây
    // đúng 1 lần -> cộng trực tiếp.
    const setting = await getOrCreateAccountingSetting();
    const buyer = await User.findById(order.user);
    if (buyer) {
      buyer.accumulatedSpending += order.totalPrice;
      const newTier = tierFromSpending(buyer.accumulatedSpending, setting);
      const tierChanged = newTier !== buyer.vipTier;
      buyer.vipTier = newTier;
      await buyer.save();
      if (tierChanged) {
        await SystemLog.create({
          action: "VIP_TIER_UP",
          description: `Khách ${buyer.name} thăng hạng ${newTier} (tích lũy ${buyer.accumulatedSpending.toLocaleString("vi-VN")}đ)`,
          user: buyer._id,
        });
      }
    }
  }

  await order.save();
  res.json(order);
};
