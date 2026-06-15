import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/axios.js";
import { useAuth } from "./AuthContext.jsx";

// Wishlist lưu trên SERVER (trong tài khoản) - khác giỏ hàng (localStorage).
// Chỉ tải khi đã đăng nhập.
const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    api.get("/wishlist").then((res) => setItems(res.data)).catch(() => {});
  }, [user]);

  const isWished = (productId) => items.some((p) => p._id === productId);

  const toggleWishlist = async (product) => {
    if (!user) return false; // trang gọi sẽ điều hướng sang /login
    if (isWished(product._id)) {
      await api.delete(`/wishlist/${product._id}`);
      setItems((prev) => prev.filter((p) => p._id !== product._id));
    } else {
      await api.post(`/wishlist/${product._id}`);
      setItems((prev) => [...prev, product]);
    }
    return true;
  };

  return (
    <WishlistContext.Provider value={{ items, isWished, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
