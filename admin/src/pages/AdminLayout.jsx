import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ChartBar, ChartLineUp, Package, Receipt, SquaresFour, Ticket, Image as ImageIcon,
  ChatCircleText, Gear, FileText, Storefront, SignOut,
  Warehouse, Truck, Calculator, GraduationCap, Scales,
} from "@phosphor-icons/react";
import api from "../lib/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

// Địa chỉ web bán hàng (app riêng, cổng khác) - "Về cửa hàng" mở tab này.
const SHOP_URL = "http://localhost:5173";

// LAYOUT KHU QUẢN TRỊ (app riêng cổng 5174): header tối + sidebar cố định.
// Menu dùng đường dẫn GỐC ("/", "/products"...) vì đây là app độc lập,
// KHÔNG còn tiền tố "/admin" như khi nhúng trong web bán hàng trước đây.
// Badge thông báo đỏ: Đơn hàng (chờ xác nhận + CK chưa thanh toán),
// Phản hồi (chưa xử lý) - tự làm mới 30s + mỗi khi chuyển mục.
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [noti, setNoti] = useState({ orders: 0, feedback: 0 });

  useEffect(() => {
    // Chỉ poll khi đã đăng nhập admin -> tránh gọi 403 lúc chưa xác thực
    if (user?.role !== "admin") return;
    const load = () =>
      api
        .get("/orders/stats/summary")
        .then((r) =>
          setNoti({
            orders: (r.data.ordersByStatus?.pending || 0) + (r.data.unpaidBanking || 0),
            feedback: r.data.unresolvedFeedback || 0,
          })
        )
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [location.pathname, user]);

  // Menu chia 2 nhóm: bán hàng & KẾ TOÁN - KHO HÀNG (v10)
  const MENU_SHOP = [
    { to: "/", label: "Tổng quan", icon: ChartBar, end: true },
    { to: "/stats", label: "Thống kê", icon: ChartLineUp },
    { to: "/products", label: "Sản phẩm", icon: Package },
    { to: "/orders", label: "Đơn hàng", icon: Receipt, badge: noti.orders },
    { to: "/categories", label: "Danh mục", icon: SquaresFour },
    { to: "/coupons", label: "Mã giảm giá", icon: Ticket },
    { to: "/banners", label: "Banner", icon: ImageIcon },
    { to: "/pages", label: "Bài viết", icon: FileText },
    { to: "/feedback", label: "Phản hồi", icon: ChatCircleText, badge: noti.feedback },
    { to: "/settings", label: "Cài đặt cửa hàng", icon: Gear },
  ];
  const MENU_ACCOUNTING = [
    { to: "/inventory", label: "Tổng quan kho", icon: Warehouse },
    { to: "/suppliers", label: "NCC & Nhập kho", icon: Truck },
    { to: "/pricing", label: "Máy tính định giá", icon: Calculator },
    { to: "/lcnrv", label: "Đánh giá tồn kho", icon: Scales },
    { to: "/students", label: "Phê duyệt HSSV", icon: GraduationCap },
    { to: "/accounting", label: "Cấu hình kế toán", icon: Calculator },
  ];

  const renderLink = (m) => (
    <NavLink
      key={m.to}
      to={m.to}
      end={m.end}
      className={({ isActive }) => `admin-link ${isActive ? "active" : ""}`}
    >
      <m.icon size={18} /> {m.label}
      {m.badge > 0 && <span className="noti-badge">{m.badge > 99 ? "99+" : m.badge}</span>}
    </NavLink>
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link to="/" className="brand">Hung<span>SaiGon</span></Link>
          <span className="tag">TRANG QUẢN TRỊ</span>
          <div className="right">
            <a href={SHOP_URL} target="_blank" rel="noreferrer">
              <Storefront size={17} style={{ verticalAlign: "-3px" }} /> Về cửa hàng
            </a>
            <span>{user?.name}</span>
            <button onClick={handleLogout}><SignOut size={17} /> Thoát</button>
          </div>
        </div>
      </header>

      <div className="admin-body">
        <div className="admin-layout">
          <aside className="admin-side">
            <div className="title">Bán hàng</div>
            {MENU_SHOP.map(renderLink)}
            <div className="title" style={{ marginTop: 10 }}>Kế toán - Kho hàng</div>
            {MENU_ACCOUNTING.map(renderLink)}
          </aside>
          <section>
            <Outlet />
          </section>
        </div>
      </div>
    </div>
  );
}
