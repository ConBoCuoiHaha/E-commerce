// ============================================================
// INVENTORY.CONTROLLER.JS - NHÀ CUNG CẤP, NHẬP LÔ, DASHBOARD KHO
// ------------------------------------------------------------
// Toàn bộ là API ADMIN (gắn requireAdmin ở route). Gồm:
//   - Nhà cung cấp: CRUD + công nợ (tính động từ lô chưa trả đủ)
//   - Nhập lô hàng: tạo batch + tăng tồn kho + tạo dòng lô (FIFO)
//   - Dashboard tài chính kho: tổng giá trị, chi phí lưu kho tích lũy,
//     vòng quay, biểu đồ tuổi kho, hàng chậm luân chuyển
// ============================================================

import mongoose from "mongoose";
import Supplier from "../models/supplier.model.js";
import PurchaseBatch from "../models/purchaseBatch.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import SystemLog from "../models/systemLog.model.js";
import { getOrCreateAccountingSetting } from "./accounting.controller.js";
import { getCategoryConfig, computeCeff, yearsInStock } from "../utils/costing.js";
import { computeNRV } from "../utils/pricing.js";

// ==================== NHÀ CUNG CẤP ====================

// Công nợ với 1 NCC = tổng (totalAmount − amountPaid) các lô của NCC đó
const debtBySupplier = async () => {
  const agg = await PurchaseBatch.aggregate([
    { $group: { _id: "$supplier", debt: { $sum: { $subtract: ["$totalAmount", "$amountPaid"] } } } },
  ]);
  return new Map(agg.map((a) => [String(a._id), a.debt]));
};

export const getSuppliers = async (req, res) => {
  const [suppliers, debtMap] = await Promise.all([
    Supplier.find().sort({ createdAt: -1 }),
    debtBySupplier(),
  ]);
  // Gắn công nợ tính động vào mỗi NCC
  res.json(
    suppliers.map((s) => ({ ...s.toObject(), debt: debtMap.get(String(s._id)) || 0 }))
  );
};

export const createSupplier = async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json(supplier);
};

export const updateSupplier = async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!supplier) return res.status(404).json({ message: "Không tìm thấy nhà cung cấp" });
  res.json(supplier);
};

export const deleteSupplier = async (req, res) => {
  // Không xóa nếu còn lô hàng tham chiếu (giữ lịch sử nhập)
  const hasBatch = await PurchaseBatch.exists({ supplier: req.params.id });
  if (hasBatch) {
    return res.status(400).json({
      message: "Nhà cung cấp đã có lô hàng - không thể xóa (giữ lịch sử). Hãy để ngừng hoạt động.",
    });
  }
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) return res.status(404).json({ message: "Không tìm thấy nhà cung cấp" });
  res.json({ message: "Đã xóa nhà cung cấp" });
};

// ==================== NHẬP LÔ HÀNG ====================

// POST /api/inventory/batches
// Body: { supplier, importDate?, note?, amountPaid?, items: [{ product,
//         variantId?, quantityImported, importPrice, vatRatePct? }] }
// Server TỰ TÍNH tổng tiền (gồm VAT), KHÔNG tin client.
export const createBatch = async (req, res) => {
  const { supplier, items, note, amountPaid = 0 } = req.body;
  const importDate = req.body.importDate ? new Date(req.body.importDate) : new Date();

  const supplierExists = await Supplier.findById(supplier);
  if (!supplierExists) return res.status(400).json({ message: "Nhà cung cấp không tồn tại" });

  // Xác minh từng dòng + dựng batchItems từ DB
  const batchItems = [];
  let totalAmount = 0;
  for (const it of items) {
    const product = await Product.findById(it.product);
    if (!product) return res.status(400).json({ message: "Có sản phẩm không tồn tại" });

    let sku = product.slug;
    if (product.variants.length > 0) {
      if (!it.variantId) {
        return res.status(400).json({ message: `Vui lòng chọn biến thể cho "${product.name}"` });
      }
      const variant = product.variants.id(it.variantId);
      if (!variant) return res.status(400).json({ message: `Biến thể không hợp lệ cho "${product.name}"` });
      sku = variant.sku;
    }

    const vat = it.vatRatePct ?? 10;
    const lineTotal = it.importPrice * it.quantityImported * (1 + vat / 100);
    totalAmount += lineTotal;

    batchItems.push({
      product: product._id,
      variantId: it.variantId || undefined,
      sku,
      quantityImported: it.quantityImported,
      quantityInstock: it.quantityImported, // mới nhập -> còn nguyên
      importPrice: it.importPrice,
      vatRatePct: vat,
    });
  }

  totalAmount = Math.round(totalAmount);
  const paymentStatus =
    amountPaid >= totalAmount ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

  // Tạo lô
  const batch = await PurchaseBatch.create({
    supplier,
    importDate,
    items: batchItems,
    totalAmount,
    amountPaid,
    paymentStatus,
    note,
  });

  // TĂNG TỒN KHO sản phẩm/biến thể tương ứng (nguyên tử từng dòng)
  for (const it of batchItems) {
    if (it.variantId) {
      await Product.updateOne(
        { _id: it.product, "variants._id": it.variantId },
        { $inc: { "variants.$.countInStock": it.quantityImported, countInStock: it.quantityImported } }
      );
    } else {
      await Product.updateOne(
        { _id: it.product },
        { $inc: { countInStock: it.quantityImported } }
      );
    }
  }

  // Ghi nhật ký
  await SystemLog.create({
    action: "BATCH_IMPORT",
    description: `Nhập lô ${batchItems.length} dòng từ ${supplierExists.name}, tổng ${totalAmount.toLocaleString("vi-VN")}đ`,
    user: req.user._id,
    refId: batch._id,
  });

  res.status(201).json(batch);
};

// GET /api/inventory/batches - lịch sử nhập (phân trang)
export const getBatches = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const [total, batches] = await Promise.all([
    PurchaseBatch.countDocuments(),
    PurchaseBatch.find()
      .populate("supplier", "name")
      .sort({ importDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  res.json({ batches, page, totalPages: Math.ceil(total / limit), total });
};

// ==================== DASHBOARD TÀI CHÍNH KHO ====================

// GET /api/inventory/overview
// Quét toàn bộ dòng lô CÒN HÀNG, tính theo cấu hình carrying rate
// của từng danh mục: tổng giá trị kho (C0), chi phí lưu kho tích lũy,
// phân nhóm TUỔI KHO, danh sách hàng chậm luân chuyển (>6 tháng).
export const getInventoryOverview = async (req, res) => {
  const setting = await getOrCreateAccountingSetting();
  const now = new Date();

  // Nạp các lô còn hàng + thông tin danh mục sản phẩm
  const batches = await PurchaseBatch.find({ "items.quantityInstock": { $gt: 0 } })
    .populate({ path: "items.product", select: "name category", populate: { path: "category", select: "slug name" } });

  let totalStockValue = 0; // theo C0
  let totalCarryingCost = 0; // chi phí lưu kho tích lũy
  // Nhóm tuổi kho: số LƯỢNG + GIÁ TRỊ theo 4 mốc
  const ageing = {
    "0-3": { qty: 0, value: 0 },
    "3-6": { qty: 0, value: 0 },
    "6-12": { qty: 0, value: 0 },
    ">12": { qty: 0, value: 0 },
  };
  const slowMoving = []; // hàng > 6 tháng -> đề xuất xả kho

  for (const batch of batches) {
    const months = (now - new Date(batch.importDate)) / (30 * 24 * 60 * 60 * 1000);
    const bucket = months < 3 ? "0-3" : months < 6 ? "3-6" : months < 12 ? "6-12" : ">12";

    for (const item of batch.items) {
      if (item.quantityInstock <= 0 || !item.product) continue;
      const slug = item.product.category?.slug;
      const { carryingRatePct } = getCategoryConfig(setting, slug);

      const value = item.importPrice * item.quantityInstock;
      const ceffUnit = computeCeff(item.importPrice, batch.importDate, carryingRatePct, now);
      const carrying = (ceffUnit - item.importPrice) * item.quantityInstock;

      totalStockValue += value;
      totalCarryingCost += carrying;
      ageing[bucket].qty += item.quantityInstock;
      ageing[bucket].value += value;

      if (months >= 6) {
        slowMoving.push({
          batchId: batch._id,
          productId: item.product._id,
          name: item.product.name,
          sku: item.sku,
          quantity: item.quantityInstock,
          importPrice: item.importPrice,
          months: Math.round(months),
          carryingCost: Math.round(carrying),
        });
      }
    }
  }

  // Vòng quay kho (đơn giản): giá vốn hàng bán 12 tháng gần nhất / giá
  // trị tồn hiện tại. COGS lấy từ các đơn delivered có ghi cogsCeff.
  const since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const [cogsAgg] = await Order.aggregate([
    { $match: { status: "delivered", deliveredAt: { $gte: since } } },
    { $group: { _id: null, cogs: { $sum: "$cogsCeff" } } },
  ]);
  const cogs12m = cogsAgg?.cogs || 0;
  const turnover = totalStockValue > 0 ? Number((cogs12m / totalStockValue).toFixed(2)) : 0;

  res.json({
    totalStockValue: Math.round(totalStockValue),
    totalCarryingCost: Math.round(totalCarryingCost),
    turnover,
    ageing: Object.entries(ageing).map(([range, v]) => ({
      range,
      qty: v.qty,
      value: Math.round(v.value),
    })),
    slowMoving: slowMoving.sort((a, b) => b.months - a.months),
  });
};

// ------------------------------------------------------------
// GET /api/inventory/lcnrv (admin) - ĐÁNH GIÁ LẠI TỒN KHO (LCNRV)
// Nguyên tắc "Giá thấp hơn giữa Giá gốc và Giá trị thuần có thể thực
// hiện được". Với mỗi dòng lô còn hàng:
//   - Giá gốc hiệu dụng = Ceff (C0 + chi phí lưu kho tích lũy)
//   - NRV = giá bán dự kiến SAU chiết khấu tối ưu − chi phí bán hàng
//   - Nếu Ceff > NRV -> trích lập dự phòng = (Ceff − NRV) × số lượng
// Tổng dự phòng được kết chuyển vào giá vốn hàng bán (làm giảm lợi
// nhuận nhưng phản ánh đúng giá trị tài sản tồn kho).
// ------------------------------------------------------------
export const getLcnrvReport = async (req, res) => {
  const setting = await getOrCreateAccountingSetting();
  const now = new Date();
  const sellingCostPct = setting.marketingRatePct + setting.gatewayFeePct;

  const batches = await PurchaseBatch.find({ "items.quantityInstock": { $gt: 0 } })
    .populate({ path: "items.product", select: "name price variants category", populate: { path: "category", select: "slug name" } });

  const rows = [];
  let totalProvision = 0;

  for (const batch of batches) {
    for (const item of batch.items) {
      if (item.quantityInstock <= 0 || !item.product) continue;
      const slug = item.product.category?.slug;
      const { carryingRatePct } = getCategoryConfig(setting, slug);

      // Giá bán hiện tại của đúng biến thể
      let sellPrice = item.product.price;
      if (item.variantId) {
        const v = item.product.variants.find((x) => String(x._id) === String(item.variantId));
        if (v) sellPrice = v.price;
      }

      // % giảm tối ưu = mức lớn nhất trong ma trận của danh mục
      const row = (setting.discountMatrix || []).find((r) => r.categorySlug === slug);
      const bestDiscPct = row ? Math.max(row.student.percent, row.mem.percent, row.vip.percent) : 0;

      const ceffUnit = Math.round(computeCeff(item.importPrice, batch.importDate, carryingRatePct, now));
      const nrvUnit = computeNRV(sellPrice, bestDiscPct, sellingCostPct);
      const provisionUnit = Math.max(0, ceffUnit - nrvUnit);
      const provision = provisionUnit * item.quantityInstock;

      if (provisionUnit > 0) {
        totalProvision += provision;
        rows.push({
          name: item.product.name,
          sku: item.sku,
          quantity: item.quantityInstock,
          ceffUnit,
          nrvUnit,
          sellPrice,
          provisionUnit,
          provision,
          months: Math.round((now - new Date(batch.importDate)) / (30 * 24 * 60 * 60 * 1000)),
        });
      }
    }
  }

  res.json({
    totalProvision: Math.round(totalProvision),
    rows: rows.sort((a, b) => b.provision - a.provision),
    note: "Trích lập dự phòng = chênh lệch khi Giá gốc hiệu dụng (Ceff) vượt Giá trị thuần (NRV).",
  });
};

// ------------------------------------------------------------
// POST /api/inventory/clearance (admin) - TẠO CHƯƠNG TRÌNH XẢ KHO
// Body: { productId, percent } - giảm giá TRỰC TIẾP sản phẩm (markdown)
// để đẩy hàng tồn lâu. Lưu originalPrice (giá gạch ngang) + hạ price.
// ------------------------------------------------------------
export const createClearanceSale = async (req, res) => {
  const { productId } = req.body;
  const percent = Math.min(90, Math.max(1, Number(req.body.percent) || 0));
  if (!percent) return res.status(400).json({ message: "Phần trăm giảm không hợp lệ" });

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  const markdown = (current) => Math.round((current * (1 - percent / 100)) / 1000) * 1000;

  if (product.variants.length > 0) {
    product.variants.forEach((v) => {
      if (!v.originalPrice || v.originalPrice < v.price) v.originalPrice = v.price;
      v.price = markdown(v.price);
    });
    if (!product.originalPrice || product.originalPrice < product.price) product.originalPrice = product.price;
    product.price = Math.min(...product.variants.map((v) => v.price));
  } else {
    if (!product.originalPrice || product.originalPrice < product.price) product.originalPrice = product.price;
    product.price = markdown(product.price);
  }
  product.isFeatured = true; // đẩy lên trang chủ để xả nhanh
  await product.save();

  await SystemLog.create({
    action: "CLEARANCE_SALE",
    description: `Xả kho "${product.name}" giảm ${percent}%`,
    user: req.user._id,
    refId: product._id,
  });
  res.json({ message: `Đã tạo chương trình xả kho giảm ${percent}% cho "${product.name}"` });
};
