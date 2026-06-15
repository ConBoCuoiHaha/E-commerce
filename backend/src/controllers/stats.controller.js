// ============================================================
// STATS.CONTROLLER.JS - THỐNG KÊ NÂNG CAO + XUẤT EXCEL (v8)
// ------------------------------------------------------------
// 2 chức năng:
//   1. GET /api/orders/stats/advanced?year=YYYY
//      - Đơn hàng + doanh thu theo 12 THÁNG của năm chọn
//      - Tổng hợp theo TỪNG NĂM (so sánh năm này với năm trước)
//      - Thống kê PHẢN HỒI (tổng/đã xử lý/chờ xử lý + theo tháng)
//   2. GET /api/orders/stats/export?year=YYYY
//      - Xuất file Excel (.xlsx) có trang trí màu sắc bằng exceljs
//
// BÀI HỌC AGGREGATION: nhóm theo thời gian dùng toán tử $year/$month
// trích từ createdAt, tính trên DB (không kéo cả collection về Node).
// Quy ước doanh thu (thống nhất toàn hệ thống): tổng totalPrice các
// đơn KHÔNG bị hủy.
// ============================================================

import ExcelJS from "exceljs";
import Order from "../models/order.model.js";
import Feedback from "../models/feedback.model.js";

// ------------------------------------------------------------
// Hàm phụ: gom dữ liệu thống kê cho 1 năm (dùng chung cho API + Excel)
// ------------------------------------------------------------
const collectStats = async (year) => {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const [monthlyAgg, yearlyAgg, fbTotal, fbResolved, fbMonthlyAgg] = await Promise.all([
    // --- Theo 12 tháng của năm chọn ---
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfYear, $lt: endOfYear } } },
      {
        $group: {
          _id: { $month: "$createdAt" }, // 1..12
          orders: { $sum: 1 },
          // $cond: chỉ cộng doanh thu đơn KHÔNG hủy
          revenue: {
            $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalPrice", 0] },
          },
          delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // --- Tổng hợp theo từng năm (mọi năm có dữ liệu) ---
    Order.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
          orders: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalPrice", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // --- Phản hồi ---
    Feedback.countDocuments(),
    Feedback.countDocuments({ isResolved: true }),
    Feedback.aggregate([
      { $match: { createdAt: { $gte: startOfYear, $lt: endOfYear } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]),
  ]);

  // Đổ kết quả aggregation vào khung đủ 12 tháng (tháng không có đơn = 0)
  const monthMap = new Map(monthlyAgg.map((m) => [m._id, m]));
  const fbMonthMap = new Map(fbMonthlyAgg.map((m) => [m._id, m.count]));
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const m = monthMap.get(i + 1);
    return {
      month: i + 1,
      orders: m?.orders || 0,
      revenue: m?.revenue || 0,
      delivered: m?.delivered || 0,
      cancelled: m?.cancelled || 0,
      feedback: fbMonthMap.get(i + 1) || 0,
    };
  });

  return {
    year,
    monthly,
    yearly: yearlyAgg.map((y) => ({ year: y._id, orders: y.orders, revenue: y.revenue })),
    feedback: { total: fbTotal, resolved: fbResolved, unresolved: fbTotal - fbResolved },
  };
};

// Đọc + kiểm tra năm từ query (mặc định năm hiện tại, chặn giá trị rác)
const parseYear = (req) => {
  const y = Number(req.query.year);
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
};

// ------------------------------------------------------------
// GET /api/orders/stats/advanced?year= (admin)
// ------------------------------------------------------------
export const getAdvancedStats = async (req, res) => {
  res.json(await collectStats(parseYear(req)));
};

// ------------------------------------------------------------
// GET /api/orders/stats/export?year= (admin) - XUẤT EXCEL CÓ MÀU
// ------------------------------------------------------------
// Bảng màu trang trí (ARGB): xanh thương hiệu cho header, kẻ sọc
// xen kẽ cho dễ đọc, xanh lá cho tổng, đỏ nhạt cho cột hủy.
const C = {
  headerBg: "FF0065EE", // xanh thương hiệu
  headerText: "FFFFFFFF",
  stripe: "FFEFF4FF", // sọc xen kẽ xanh rất nhạt
  totalBg: "FFD1FAE5", // xanh lá nhạt cho dòng tổng
  titleText: "FF0065EE",
  cancelText: "FFD92D20",
};

// Hàm phụ: kẻ 1 sheet bảng có header màu + sọc xen kẽ + viền
const styleSheet = (sheet, headerRowIdx, dataRows) => {
  const header = sheet.getRow(headerRowIdx);
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.headerBg } };
    cell.font = { bold: true, color: { argb: C.headerText }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  header.height = 22;

  for (let i = 0; i < dataRows; i++) {
    const row = sheet.getRow(headerRowIdx + 1 + i);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9E2F5" } },
        bottom: { style: "thin", color: { argb: "FFD9E2F5" } },
        left: { style: "thin", color: { argb: "FFD9E2F5" } },
        right: { style: "thin", color: { argb: "FFD9E2F5" } },
      };
      if (i % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.stripe } };
      }
    });
  }
};

export const exportStatsExcel = async (req, res) => {
  const year = parseYear(req);
  const stats = await collectStats(year);

  const wb = new ExcelJS.Workbook();
  wb.creator = "HungSaiGon Admin";
  wb.created = new Date();

  // ============ SHEET 1: DOANH THU THEO THÁNG ============
  const s1 = wb.addWorksheet(`Doanh thu ${year}`, {
    views: [{ state: "frozen", ySplit: 3 }], // đóng băng 3 dòng đầu khi cuộn
  });
  s1.columns = [
    { width: 14 }, { width: 14 }, { width: 20 }, { width: 13 }, { width: 12 }, { width: 12 },
  ];
  // Tiêu đề lớn
  s1.mergeCells("A1:F1");
  const title = s1.getCell("A1");
  title.value = `HUNGSAIGON - BÁO CÁO KINH DOANH NĂM ${year}`;
  title.font = { bold: true, size: 15, color: { argb: C.titleText } };
  title.alignment = { horizontal: "center" };
  s1.getRow(1).height = 28;
  s1.mergeCells("A2:F2");
  s1.getCell("A2").value = `Xuất ngày ${new Date().toLocaleString("vi-VN")} · Doanh thu = tổng tiền các đơn không bị hủy`;
  s1.getCell("A2").font = { italic: true, size: 10, color: { argb: "FF71717A" } };
  s1.getCell("A2").alignment = { horizontal: "center" };

  s1.getRow(3).values = ["Tháng", "Số đơn", "Doanh thu (₫)", "Đã giao", "Đã hủy", "Phản hồi"];
  stats.monthly.forEach((m) => {
    s1.addRow([`Tháng ${m.month}`, m.orders, m.revenue, m.delivered, m.cancelled, m.feedback]);
  });
  // Dòng TỔNG CỘNG nền xanh lá
  const sum = (k) => stats.monthly.reduce((s, m) => s + m[k], 0);
  const totalRow = s1.addRow(["TỔNG CỘNG", sum("orders"), sum("revenue"), sum("delivered"), sum("cancelled"), sum("feedback")]);
  totalRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
    cell.font = { bold: true };
  });
  styleSheet(s1, 3, 12);
  // Định dạng tiền tệ + tô đỏ cột hủy
  for (let r = 4; r <= 16; r++) {
    s1.getCell(`C${r}`).numFmt = "#,##0";
    const cancelCell = s1.getCell(`E${r}`);
    if (cancelCell.value > 0) cancelCell.font = { ...(cancelCell.font || {}), color: { argb: C.cancelText }, bold: true };
  }

  // ============ SHEET 2: SO SÁNH CÁC NĂM ============
  const s2 = wb.addWorksheet("Theo năm");
  s2.columns = [{ width: 12 }, { width: 14 }, { width: 22 }];
  s2.getRow(1).values = ["Năm", "Số đơn", "Doanh thu (₫)"];
  stats.yearly.forEach((y) => s2.addRow([y.year, y.orders, y.revenue]));
  styleSheet(s2, 1, stats.yearly.length);
  for (let r = 2; r <= 1 + stats.yearly.length; r++) s2.getCell(`C${r}`).numFmt = "#,##0";

  // ============ SHEET 3: PHẢN HỒI ============
  const s3 = wb.addWorksheet("Phản hồi");
  s3.columns = [{ width: 26 }, { width: 14 }];
  s3.getRow(1).values = ["Chỉ số", "Giá trị"];
  s3.addRow(["Tổng phản hồi", stats.feedback.total]);
  s3.addRow(["Đã xử lý", stats.feedback.resolved]);
  s3.addRow(["Chờ xử lý", stats.feedback.unresolved]);
  styleSheet(s3, 1, 3);
  // Chờ xử lý > 0 -> tô đỏ nhắc admin
  if (stats.feedback.unresolved > 0) {
    s3.getCell("B4").font = { bold: true, color: { argb: C.cancelText } };
  }

  // ============ Trả file về trình duyệt ============
  // Header Content-Disposition: báo trình duyệt đây là file tải về
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="hungsaigon-thong-ke-${year}.xlsx"`
  );
  await wb.xlsx.write(res); // ghi thẳng vào response stream
  res.end();
};
