import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MagnifyingGlass, Scales, Heart, ShoppingCart, Package,
  SignOut, User,
} from "@phosphor-icons/react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";
import { useCompare } from "../context/CompareContext.jsx";

// Header: logo + ô tìm kiếm pill + nhóm icon bên phải (kiểu thinkpro).
// Danh mục KHÔNG nằm ở header - nằm ở menu dọc bên trái trang chủ.
export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalCount } = useCart();
  const { items: wishItems } = useWishlist();
  const { ids: compareIds } = useCompare();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/products?keyword=${encodeURIComponent(keyword)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">Hung<span>SaiGon</span></Link>

        <form className="nav-search" onSubmit={handleSearch}>
          <input
            placeholder="Bạn cần tìm gì?"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="submit" aria-label="Tìm kiếm">
            <MagnifyingGlass size={19} weight="bold" />
          </button>
        </form>

        <div className="nav-links">
          <Link to="/compare" className="nav-item">
            <Scales size={21} />
            So sánh
            {compareIds.length > 0 && <span className="badge">{compareIds.length}</span>}
          </Link>
          <Link to="/wishlist" className="nav-item">
            <Heart size={21} />
            Yêu thích
            {wishItems.length > 0 && <span className="badge">{wishItems.length}</span>}
          </Link>
          <Link to="/cart" className="nav-item">
            <ShoppingCart size={21} />
            Giỏ hàng
            {totalCount > 0 && <span className="badge">{totalCount}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/account/orders" className="nav-item">
                <Package size={21} />
                Đơn hàng
              </Link>
              {/* v7: vào dashboard cá nhân (hồ sơ, địa chỉ, voucher) */}
              <Link to="/account" className="nav-item" title="Tài khoản của tôi">
                <User size={21} />
                {user.name.split(" ").pop()}
              </Link>
              {/* v10: link Quản trị đã gỡ - khu quản trị là app riêng
                  (cổng 5174), admin tự truy cập, không lộ trên web bán hàng */}
              <button className="nav-item" onClick={handleLogout} title={user.name}>
                <SignOut size={21} />
                Thoát
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-item">
              <User size={21} />
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
