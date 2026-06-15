import { createContext, useContext, useEffect, useState } from "react";

// So sánh sản phẩm: lưu tối đa 3 id trong localStorage (không cần đăng nhập).
// Trang /compare sẽ gọi API /products/compare/list?ids=... để lấy chi tiết.
const CompareContext = createContext(null);
const MAX_COMPARE = 3;

export function CompareProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("compare")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("compare", JSON.stringify(ids));
  }, [ids]);

  const inCompare = (id) => ids.includes(id);

  // Trả về thông báo lỗi nếu vượt giới hạn, null nếu OK
  const toggleCompare = (id) => {
    if (inCompare(id)) {
      setIds((prev) => prev.filter((x) => x !== id));
      return null;
    }
    if (ids.length >= MAX_COMPARE) return `Chỉ so sánh tối đa ${MAX_COMPARE} sản phẩm`;
    setIds((prev) => [...prev, id]);
    return null;
  };

  const clearCompare = () => setIds([]);

  return (
    <CompareContext.Provider value={{ ids, inCompare, toggleCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => useContext(CompareContext);
