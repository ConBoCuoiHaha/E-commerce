// ============================================================
// ACCOUNTING.CONTROLLER.JS - CẤU HÌNH KẾ TOÁN (singleton)
// ------------------------------------------------------------
// GET/PUT /api/accounting/settings (admin). Tự sinh cấu hình mặc định
// (kèm tỷ lệ theo từng danh mục) ở lần đọc đầu tiên.
// ============================================================

import AccountingSetting from "../models/accountingSetting.model.js";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";
import PurchaseBatch from "../models/purchaseBatch.model.js";
import SystemLog from "../models/systemLog.model.js";
import { computeOptimalPrice } from "../utils/pricing.js";
import { getCategoryConfig } from "../utils/costing.js";

// Tỷ lệ mặc định theo slug danh mục (suy từ bảng số liệu trong tài liệu)
const DEFAULTS_BY_SLUG = {
  laptop: { carryingRatePct: 15, depreciationPct: [30, 25, 20] },
  "man-hinh": { carryingRatePct: 12, depreciationPct: [20, 20, 15] },
  ram: { carryingRatePct: 12, depreciationPct: [15, 15, 15] },
  "o-cung-ssd": { carryingRatePct: 12, depreciationPct: [15, 15, 15] },
  chuot: { carryingRatePct: 10, depreciationPct: [10, 10, 10] },
  "ban-phim": { carryingRatePct: 10, depreciationPct: [10, 10, 10] },
};

// Ma trận chiết khấu mặc định theo slug: { student/mem/vip: [percent, cap] }
// CAP lấy theo tài liệu (laptop HSSV 1tr / H-MEM 300k / H-VIP 500k...);
// % là đề xuất ban đầu (tài liệu chỉ cho CAP) - admin chỉnh sau qua UI.
const DISCOUNT_BY_SLUG = {
  laptop: { student: [5, 1000000], mem: [1, 300000], vip: [3, 500000] },
  "man-hinh": { student: [5, 300000], mem: [2, 150000], vip: [3, 250000] },
  ram: { student: [5, 100000], mem: [2, 50000], vip: [3, 80000] },
  "o-cung-ssd": { student: [5, 150000], mem: [2, 80000], vip: [3, 120000] },
  chuot: { student: [7, 200000], mem: [2, 100000], vip: [3, 150000] },
  "ban-phim": { student: [7, 200000], mem: [2, 100000], vip: [3, 150000] },
};
// Mức mặc định cho danh mục chưa cấu hình
const DISCOUNT_FALLBACK = { student: [3, 200000], mem: [1, 100000], vip: [2, 150000] };

// Lấy (hoặc tạo) document cấu hình kế toán. Lần đầu: nạp categoryConfigs
// từ danh mục hiện có để admin có sẵn bảng tỷ lệ mà chỉnh.
// Sinh ma trận chiết khấu mặc định từ danh sách danh mục
const buildDiscountMatrix = (categories) => {
  const mk = ([percent, cap]) => ({ percent, cap });
  return categories.map((c) => {
    const d = DISCOUNT_BY_SLUG[c.slug] || DISCOUNT_FALLBACK;
    return { categorySlug: c.slug, label: c.name, student: mk(d.student), mem: mk(d.mem), vip: mk(d.vip) };
  });
};

export const getOrCreateAccountingSetting = async () => {
  let setting = await AccountingSetting.findOne({ key: "accounting" });

  // Backfill: cấu hình đã tạo từ trước (P2) nhưng chưa có ma trận
  // chiết khấu (P3) -> nạp mặc định 1 lần.
  if (setting && (!setting.discountMatrix || setting.discountMatrix.length === 0)) {
    const categories = await Category.find().select("name slug");
    setting.discountMatrix = buildDiscountMatrix(categories);
    await setting.save();
  }

  if (!setting) {
    const categories = await Category.find().select("name slug");
    const categoryConfigs = categories.map((c) => ({
      categorySlug: c.slug,
      label: c.name,
      carryingRatePct: DEFAULTS_BY_SLUG[c.slug]?.carryingRatePct ?? 12,
      depreciationPct: DEFAULTS_BY_SLUG[c.slug]?.depreciationPct ?? [15, 15, 15],
    }));
    // Ma trận chiết khấu mặc định theo từng danh mục
    const mk = ([percent, cap]) => ({ percent, cap });
    const discountMatrix = categories.map((c) => {
      const d = DISCOUNT_BY_SLUG[c.slug] || DISCOUNT_FALLBACK;
      return {
        categorySlug: c.slug,
        label: c.name,
        student: mk(d.student),
        mem: mk(d.mem),
        vip: mk(d.vip),
      };
    });
    setting = await AccountingSetting.create({ key: "accounting", categoryConfigs, discountMatrix });
  }
  return setting;
};

export const getAccountingSettings = async (req, res) => {
  res.json(await getOrCreateAccountingSetting());
};

export const updateAccountingSettings = async (req, res) => {
  await getOrCreateAccountingSetting(); // đảm bảo đã tồn tại
  const setting = await AccountingSetting.findOneAndUpdate(
    { key: "accounting" },
    req.body,
    { new: true, runValidators: true }
  );
  res.json(setting);
};

// ------------------------------------------------------------
// Hàm phụ: lấy GIÁ VỐN C0 mới nhất (lô FIFO gần nhất) của 1 sản phẩm/
// biến thể. Không có lô -> ước tính từ giá bán × openingCostRatio.
// ------------------------------------------------------------
const getLatestC0 = async (product, variantId, setting) => {
  const variantMatch = variantId ? { "items.variantId": variantId } : {};
  const batch = await PurchaseBatch.findOne({ "items.product": product._id, ...variantMatch })
    .sort({ importDate: -1 });
  if (batch) {
    const item = batch.items.find(
      (i) => i.product.toString() === product._id.toString() &&
        (variantId ? String(i.variantId) === String(variantId) : !i.variantId)
    );
    if (item) return item.importPrice;
  }
  // Chưa có lô -> ước tính
  const basePrice = variantId
    ? product.variants.id(variantId)?.price || product.price
    : product.price;
  return Math.round(basePrice * (setting.openingCostRatio || 0.75));
};

// ------------------------------------------------------------
// POST /api/accounting/price-calc (admin) - MÁY TÍNH ĐỊNH GIÁ ĐỘNG
// Body: { productId, variantId?, n, fc?, pe?, mPct?, gtPct?, rpPct?, lnPct? }
// Tự lấy C0 từ lô FIFO gần nhất; tính P* + mô phỏng giá sau chiết khấu
// HSSV/VIP + cảnh báo chạm giá sàn (giá vốn C0).
// ------------------------------------------------------------
export const priceCalc = async (req, res) => {
  const setting = await getOrCreateAccountingSetting();
  const { productId, variantId } = req.body;

  const product = await Product.findById(productId).populate("category", "slug name");
  if (!product) return res.status(400).json({ message: "Sản phẩm không tồn tại" });

  const c0 = await getLatestC0(product, variantId, setting);
  const n = Math.max(1, Number(req.body.n) || 25);

  // Tham số: ưu tiên giá trị admin gửi, mặc định lấy từ cấu hình
  const params = {
    c0,
    n,
    fc: req.body.fc != null ? Number(req.body.fc) : setting.fixedCostMonthly,
    pe: req.body.pe != null ? Number(req.body.pe) : setting.packagingCost,
    mPct: req.body.mPct != null ? Number(req.body.mPct) : setting.marketingRatePct,
    gtPct: req.body.gtPct != null ? Number(req.body.gtPct) : setting.gatewayFeePct,
    rpPct: req.body.rpPct != null ? Number(req.body.rpPct) : setting.riskProvisionPct,
    lnPct: req.body.lnPct != null ? Number(req.body.lnPct) : setting.netProfitPct,
  };

  const result = computeOptimalPrice(params);
  if (result.invalid) {
    return res.status(400).json({ message: "Tổng các tỷ lệ % >= 100, không thể định giá" });
  }

  // Mô phỏng giá sau chiết khấu từng hạng (theo ma trận danh mục)
  const slug = product.category?.slug;
  const row = (setting.discountMatrix || []).find((r) => r.categorySlug === slug);
  const simulate = (tierKey, label) => {
    const deal = row?.[tierKey] || { percent: 0, cap: 0 };
    let off = Math.round((result.price * deal.percent) / 100);
    if (deal.cap > 0) off = Math.min(off, deal.cap);
    const finalPrice = result.price - off;
    return {
      tier: label,
      discount: off,
      finalPrice,
      profit: finalPrice - c0, // lợi nhuận gộp danh nghĩa sau giảm
      belowFloor: finalPrice < c0, // chạm giá sàn (lỗ so với giá vốn)
    };
  };

  res.json({
    productName: product.name,
    c0,
    n,
    params,
    optimalPrice: result.price,
    allocatedFixed: result.allocatedFixed,
    grossProfit: result.price - c0,
    grossMarginPct: Number((((result.price - c0) / result.price) * 100).toFixed(1)),
    floor: c0,
    scenarios: [
      simulate("student", "HSSV"),
      simulate("mem", "VIP Bạc"),
      simulate("vip", "VIP Vàng"),
    ],
  });
};

// ------------------------------------------------------------
// POST /api/accounting/apply-price (admin) - ÁP GIÁ LÊN WEBSITE
// Body: { productId, variantId?, price } -> cập nhật giá niêm yết.
// ------------------------------------------------------------
export const applyPrice = async (req, res) => {
  const { productId, variantId, price } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant) return res.status(400).json({ message: "Biến thể không hợp lệ" });
    variant.price = price;
    // Cập nhật lại giá hiển thị cấp product = giá biến thể rẻ nhất
    product.price = Math.min(...product.variants.map((v) => v.price));
  } else {
    product.price = price;
  }
  await product.save();

  await SystemLog.create({
    action: "PRICE_APPLIED",
    description: `Áp giá ${price.toLocaleString("vi-VN")}đ cho "${product.name}"${variantId ? " (biến thể)" : ""}`,
    user: req.user._id,
    refId: product._id,
  });
  res.json({ message: `Đã áp giá ${price.toLocaleString("vi-VN")}đ lên website` });
};
