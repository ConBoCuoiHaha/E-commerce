import { createContext, useContext, useEffect, useRef, useState } from "react";
import api from "../lib/axios.js";
import { useAuth } from "./AuthContext.jsx";

// GIỎ HÀNG 2 CHẾ ĐỘ (v4):
//   - Khách vãng lai: localStorage (như cũ)
//   - Đã đăng nhập:  giỏ SERVER (đồng bộ đa thiết bị, giá luôn mới)
//   - Lúc đăng nhập: nếu giỏ local có hàng -> gọi /cart/merge để TRỘN
//     vào giỏ server (item trùng thì cộng dồn), rồi xóa giỏ local.
//
// Mỗi item hiển thị có dạng thống nhất cho cả 2 chế độ:
//   { key, itemId?, productId, variantId, name, variantName, price,
//     image, maxStock, quantity }
const CartContext = createContext(null);

const lineKey = (productId, variantId) => `${productId}::${variantId || "default"}`;

const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState(readLocal);
  // useRef: nhớ "đã merge cho phiên đăng nhập này chưa" - không gây re-render
  const mergedRef = useRef(false);

  // Map dữ liệu giỏ server về dạng hiển thị chung
  const fromServer = (serverItems) =>
    serverItems.map((i) => ({
      key: lineKey(i.productId, i.variantId),
      itemId: i.itemId, // id dòng giỏ trên server (để sửa/xóa)
      productId: i.productId,
      variantId: i.variantId,
      name: i.name,
      variantName: i.variantName,
      price: i.price, // giá MỚI NHẤT server enrich từ DB
      image: i.image,
      maxStock: i.maxStock,
      quantity: i.quantity,
    }));

  // Khi trạng thái đăng nhập thay đổi:
  //   - Vừa đăng nhập: merge giỏ local (nếu có) -> tải giỏ server
  //   - Đăng xuất: quay về giỏ local
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      mergedRef.current = false;
      setItems(readLocal());
      return;
    }

    const sync = async () => {
      try {
        const local = readLocal();
        if (local.length > 0 && !mergedRef.current) {
          // Trộn giỏ local vào server rồi dọn local
          const res = await api.post("/cart/merge", {
            items: local.map((i) => ({
              product: i.productId,
              ...(i.variantId ? { variantId: i.variantId } : {}),
              quantity: i.quantity,
            })),
          });
          localStorage.removeItem("cart");
          setItems(fromServer(res.data));
        } else {
          const res = await api.get("/cart");
          setItems(fromServer(res.data));
        }
        mergedRef.current = true;
      } catch {
        // lỗi mạng -> giữ nguyên hiển thị hiện tại
      }
    };
    sync();
  }, [user, authLoading]);

  // Lưu localStorage CHỈ khi là khách vãng lai
  useEffect(() => {
    if (!user) localStorage.setItem("cart", JSON.stringify(items));
  }, [items, user]);

  // ---------------- Các thao tác giỏ hàng ----------------

  const addToCart = async (product, variant, quantity = 1) => {
    if (user) {
      const res = await api.post("/cart/items", {
        product: product._id,
        ...(variant ? { variantId: variant._id } : {}),
        quantity,
      });
      setItems(fromServer(res.data));
      return;
    }
    // Khách vãng lai: thao tác trên localStorage
    const key = lineKey(product._id, variant?._id);
    setItems((prev) => {
      const existed = prev.find((i) => i.key === key);
      if (existed) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(100, i.quantity + quantity) } : i
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product._id,
          variantId: variant?._id || null,
          name: product.name,
          variantName: variant?.name || null,
          price: variant?.price ?? product.price,
          image: product.image,
          maxStock: variant?.countInStock ?? product.countInStock,
          quantity,
        },
      ];
    });
  };

  const updateQuantity = async (key, quantity) => {
    quantity = Math.max(1, quantity);
    if (user) {
      const item = items.find((i) => i.key === key);
      if (!item) return;
      const res = await api.put(`/cart/items/${item.itemId}`, { quantity });
      setItems(fromServer(res.data));
      return;
    }
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity } : i)));
  };

  const removeFromCart = async (key) => {
    if (user) {
      const item = items.find((i) => i.key === key);
      if (!item) return;
      const res = await api.delete(`/cart/items/${item.itemId}`);
      setItems(fromServer(res.data));
      return;
    }
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const clearCart = async () => {
    if (user) {
      try { await api.delete("/cart"); } catch { /* đặt hàng xong giỏ trống là phụ */ }
    }
    localStorage.removeItem("cart");
    setItems([]);
  };

  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, updateQuantity, removeFromCart, clearCart, totalPrice, totalCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
