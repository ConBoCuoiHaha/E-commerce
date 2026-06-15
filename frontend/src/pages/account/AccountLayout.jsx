import { NavLink, Outlet } from "react-router-dom";
import { UserCircle, Package, MapPin, Ticket, Crown } from "@phosphor-icons/react";
import { useAuth } from "../../context/AuthContext.jsx";

// DASHBOARD KHÁCH HÀNG (v7): khu "Tài khoản của tôi" với menu trái.
// Khách xem được: hồ sơ cá nhân, lịch sử mua hàng + thanh toán,
// sổ địa chỉ giao hàng, voucher đang khả dụng.
const MENU = [
  { to: "/account", label: "Hồ sơ cá nhân", icon: UserCircle, end: true },
  { to: "/account/orders", label: "Đơn hàng của tôi", icon: Package },
  { to: "/account/membership", label: "Thành viên & ưu đãi", icon: Crown },
  { to: "/account/addresses", label: "Sổ địa chỉ", icon: MapPin },
  { to: "/account/vouchers", label: "Voucher của tôi", icon: Ticket },
];

export default function AccountLayout() {
  const { user } = useAuth();

  return (
    <div className="shop-layout">
      <aside className="sidebar">
        {/* Thẻ chào user */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 14px" }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} referrerPolicy="no-referrer" />
          ) : (
            <UserCircle size={40} color="var(--accent)" />
          )}
          <div>
            <b style={{ fontSize: 14 }}>{user?.name}</b>
            <div className="meta">@{user?.username}</div>
          </div>
        </div>

        {MENU.map((m) => (
          <NavLink
            key={m.to}
            to={m.to}
            end={m.end}
            className={({ isActive }) => `admin-link ${isActive ? "active" : ""}`}
          >
            <m.icon size={18} /> {m.label}
          </NavLink>
        ))}
      </aside>

      <section>
        <Outlet />
      </section>
    </div>
  );
}
