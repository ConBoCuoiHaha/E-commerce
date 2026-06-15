// Tiện ích định dạng tiền tệ Việt Nam dùng chung trong app quản trị.
// (Web bán hàng để hàm này trong ProductCard; app admin tách ra lib riêng.)
export const formatVND = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";
