// ============================================================
// INVENTORY.VALIDATION.JS - SCHEMA ZOD CHO NHÀ CUNG CẤP, LÔ NHẬP,
//                           CẤU HÌNH KẾ TOÁN
// ============================================================

import { z } from "zod";

const objectIdSchema = z
  .string("ID phải là chuỗi")
  .regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

// ---------- NHÀ CUNG CẤP ----------
export const createSupplierSchema = z.object({
  name: z.string("Tên NCC phải là chuỗi").trim().min(2, "Tên ít nhất 2 ký tự").max(255),
  contactName: z.string().trim().max(100).optional(),
  phone: z.string("SĐT phải là chuỗi").trim().regex(/^0\d{9}$/, "SĐT không hợp lệ (10 số, bắt đầu 0)"),
  email: z.email("Email không hợp lệ").optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  taxCode: z.string().trim().max(50).optional(),
  paymentTerms: z.enum(["COD", "NET30", "NET60"], "Điều khoản thanh toán không hợp lệ").optional(),
});
export const updateSupplierSchema = createSupplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ---------- LÔ NHẬP ----------
export const createBatchSchema = z.object({
  supplier: objectIdSchema,
  importDate: z.coerce.date("Ngày nhập không hợp lệ").optional(),
  note: z.string().trim().max(500).optional(),
  amountPaid: z.number("Số tiền đã trả phải là số").nonnegative().optional(),
  items: z
    .array(
      z.object({
        product: objectIdSchema,
        variantId: objectIdSchema.optional(),
        quantityImported: z.number("Số lượng phải là số").int().min(1, "Số lượng tối thiểu 1").max(100000),
        importPrice: z.number("Giá nhập phải là số").nonnegative("Giá nhập không âm"),
        vatRatePct: z.number("VAT phải là số").min(0).max(100).optional(),
      }),
      "Danh sách hàng nhập phải là mảng"
    )
    .min(1, "Lô hàng phải có ít nhất 1 dòng"),
});

// ---------- CẤU HÌNH KẾ TOÁN ----------
export const updateAccountingSchema = z.object({
  fixedCostMonthly: z.number().nonnegative().optional(),
  packagingCost: z.number().nonnegative().optional(),
  marketingRatePct: z.number().min(0).max(100).optional(),
  gatewayFeePct: z.number().min(0).max(100).optional(),
  riskProvisionPct: z.number().min(0).max(100).optional(),
  netProfitPct: z.number().min(0).max(100).optional(),
  defaultCarryingRatePct: z.number().min(0).max(100).optional(),
  defaultDepreciationPct: z.array(z.number().min(0).max(100)).optional(),
  vipMemThreshold: z.number().nonnegative().optional(),
  vipVipThreshold: z.number().nonnegative().optional(),
  openingCostRatio: z.number().min(0).max(1).optional(),
  categoryConfigs: z
    .array(
      z.object({
        categorySlug: z.string().trim().min(1),
        label: z.string().trim().max(100).optional(),
        carryingRatePct: z.number().min(0).max(100),
        depreciationPct: z.array(z.number().min(0).max(100)),
      })
    )
    .optional(),
});
