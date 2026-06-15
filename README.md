<div align="center">

# 🛒 HungSaiGon — Website thương mại điện tử thiết bị công nghệ

Bán laptop, bàn phím, chuột, màn hình, RAM, ổ cứng SSD — kèm **hệ thống quản trị + kế toán kho** đầy đủ.

Dự án **MERN** (MongoDB · Express · React · Node.js) tự xây để học **backend Node.js & bảo mật web**.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_httpOnly-000000?logo=jsonwebtokens&logoColor=white)

<img src="ScreenShot_E/shop-home.png" alt="Trang chủ HungSaiGon" width="85%" />

</div>

---

## 📑 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tính năng](#-tính-năng)
- [Công nghệ](#-công-nghệ)
- [Kiến trúc & cấu trúc thư mục](#-kiến-trúc--cấu-trúc-thư-mục)
- [Cài đặt & chạy](#-cài-đặt--chạy)
- [Bảo mật](#-bảo-mật)
- [Giao diện trang bán hàng](#-giao-diện-trang-bán-hàng)
- [Giao diện trang quản trị](#-giao-diện-trang-quản-trị)

---

## 🎯 Tổng quan

Hệ thống gồm **3 ứng dụng độc lập** chạy song song, dùng chung 1 backend API:

| Ứng dụng | Vai trò | Cổng |
|---|---|---|
| **backend** | REST API (Express + MongoDB) | `5000` |
| **frontend** | Web bán hàng cho khách | `5173` |
| **admin** | Trang quản trị nội bộ (tách riêng để bảo mật) | `5174` |

> Khu quản trị là **app riêng** (không nằm trong bundle của web bán hàng) nên người mua không thể tải/đọc mã nguồn quản trị. Hai app dùng **bộ cookie token riêng** (`jwt` cho cửa hàng, `ajwt` cho quản trị) để không xung đột phiên khi cùng chạy `localhost`.

---

## ✨ Tính năng

### 🛍️ Trang bán hàng (khách)
- Trang chủ: banner carousel, sản phẩm nổi bật, menu danh mục flyout
- Danh sách sản phẩm: lọc theo danh mục / hãng / giá / tìm kiếm, sắp xếp
- Chi tiết sản phẩm: **biến thể** (cấu hình, màu, dung lượng), thông số kỹ thuật, **đánh giá có xác thực mua hàng**
- Giỏ hàng (localStorage), **so sánh sản phẩm** (tối đa 3), **danh sách yêu thích**
- Đặt hàng: **COD** hoặc **chuyển khoản** (tự đối soát qua email ngân hàng)
- Dashboard tài khoản: hồ sơ, đơn hàng, sổ địa chỉ, **voucher**, **hạng thành viên** (HSSV / VIP)
- Đăng nhập email/mật khẩu **hoặc Google OAuth**; xác thực email, quên/đặt lại mật khẩu

### 🗂️ Trang quản trị
- **Bảng điều khiển** + **thống kê nâng cao** (doanh thu nhiều năm, xuất Excel)
- Quản lý: sản phẩm (biến thể + ảnh), đơn hàng (đổi trạng thái, **gửi hóa đơn PDF**), danh mục, mã giảm giá, banner, bài viết, phản hồi, cài đặt cửa hàng
- Badge thông báo realtime (đơn chờ, phản hồi chưa xử lý)

### 📦 Kế toán — Kho hàng (nghiệp vụ nâng cao)
- **Tổng quan tài chính kho**: tổng giá trị, chi phí lưu kho, vòng quay, phân bổ theo tuổi kho
- **Nhà cung cấp & nhập kho** theo **lô (FIFO)**, theo dõi công nợ
- **Máy tính định giá động**: `P* = (C0 + FC/N + đóng gói) / (1 − %M − %Gt − %Rp − %Ln)`
- **Đánh giá lại tồn kho (LCNRV)**: so Giá gốc hiệu dụng (Ceff) với Giá trị thuần (NRV) → đề xuất **trích lập dự phòng**
- **Phê duyệt HSSV** (xác minh thẻ sinh viên) + cron tự gỡ quyền khi hết hạn
- **Cấu hình kế toán**: định phí, tỷ lệ %, ma trận chiết khấu theo hạng × danh mục

### 🔐 Bảo mật
- JWT **access (15') + refresh (7 ngày)** trong **cookie httpOnly + SameSite strict**, xoay refresh token (rotation) lưu hash
- Băm mật khẩu **bcrypt**, **khóa tài khoản** khi sai nhiều lần, **chống dò tài khoản** (anti-enumeration)
- Validate dữ liệu bằng **Zod**, **helmet**, **rate limiting**, kiểm tra quyền **IDOR**
- Trừ tồn kho **nguyên tử (atomic) theo FIFO**, đánh giá chỉ từ khách **đã mua hàng**

---

## 🧰 Công nghệ

**Backend:** Node.js, Express 5, Mongoose 8, JWT, bcrypt, Zod, Helmet, express-rate-limit, Multer (ảnh lưu trong MongoDB), Nodemailer + ImapFlow (đối soát email), PDFKit (hóa đơn), ExcelJS, node-cron, google-auth-library.

**Frontend & Admin:** React 18, Vite 6, React Router 6, Axios, Phosphor Icons.

**Thiết kế UI:** một màu nhấn xanh `#0065ee`, bo góc 12px, icon Phosphor, không emoji/gradient (trừ hero banner).

---

## 🏗️ Kiến trúc & cấu trúc thư mục

```
E-commerce/
├── backend/                 # REST API (Express + MongoDB)
│   ├── src/
│   │   ├── models/          # ~23 Mongoose schema (user, product, order, purchaseBatch...)
│   │   ├── controllers/     # Xử lý nghiệp vụ
│   │   ├── routes/          # Khai báo endpoint
│   │   ├── middlewares/     # protectRoute, requireAdmin, validate, errorHandler
│   │   ├── utils/           # generateToken, costing (FIFO/Ceff), pricing, invoicePdf...
│   │   ├── services/        # bankMailWatcher (IMAP), studentExpiryCron
│   │   └── server.js
│   ├── .env.example         # Mẫu biến môi trường (copy thành .env)
│   └── package.json
├── frontend/                # Web bán hàng (React + Vite) — cổng 5173
├── admin/                   # Trang quản trị (React + Vite) — cổng 5174
└── ScreenShot_E/            # Ảnh giao diện (dùng cho README)
```

---

## 🚀 Cài đặt & chạy

### Yêu cầu
- **Node.js** ≥ 18
- **MongoDB** đang chạy ở `mongodb://127.0.0.1:27017` (hoặc MongoDB Atlas)

### 1) Clone
```bash
git clone https://github.com/ConBoCuoiHaha/E-commerce.git
cd E-commerce
```

### 2) Backend
```bash
cd backend
npm install
cp .env.example .env        # rồi điền giá trị thật vào .env
npm run dev                 # chạy http://localhost:5000
```

Tạo nhanh chuỗi bí mật JWT:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **Lưu ý bảo mật:** file `.env` chứa secret (MongoDB, JWT, App Password Gmail) và **đã được `.gitignore`** — không bao giờ commit lên Git. Chỉ chỉnh sửa từ máy của bạn.

### 3) Frontend (web bán hàng)
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

### 4) Admin (quản trị)
```bash
cd admin
npm install
npm run dev                 # http://localhost:5174
```

> Cả 3 cần chạy đồng thời. Vite proxy `/api` của frontend/admin sẽ chuyển tiếp sang backend `:5000`.

### 👤 Tài khoản quản trị
Database khởi đầu rỗng (file seed dùng một lần đã được xóa). Để có quyền quản trị:
1. Đăng ký một tài khoản ở web bán hàng.
2. Trong MongoDB, đặt `role: "admin"` cho user đó (vd qua `mongosh` hoặc MongoDB Compass).
3. Đăng nhập tại `http://localhost:5174` bằng tài khoản admin vừa tạo.

---

## 🔐 Bảo mật

| Lớp | Cơ chế |
|---|---|
| Xác thực | JWT access + refresh, cookie `httpOnly` + `SameSite=strict`, refresh rotation (lưu hash, thu hồi được) |
| Mật khẩu | bcrypt; khóa tài khoản tạm thời khi brute-force; thông báo lỗi chung (chống dò tài khoản) |
| Phân quyền | `requireAdmin` ở backend (không tin UI); kiểm tra IDOR theo chủ sở hữu |
| Đầu vào | Zod validation, Helmet, rate limiting (global + auth) |
| Dữ liệu | Trừ tồn kho atomic theo FIFO; đánh giá chỉ từ đơn đã giao |

---

## 🖥️ Giao diện trang bán hàng

<table>
<tr>
<td width="50%"><b>Trang chủ</b><br/><img src="ScreenShot_E/shop-home.png"/></td>
<td width="50%"><b>Chi tiết sản phẩm (biến thể, đánh giá)</b><br/><img src="ScreenShot_E/shop-product-detail.png"/></td>
</tr>
<tr>
<td><b>Giỏ hàng</b><br/><img src="ScreenShot_E/shop-cart.png"/></td>
<td><b>Đặt hàng (COD / chuyển khoản)</b><br/><img src="ScreenShot_E/shop-checkout.png"/></td>
</tr>
<tr>
<td><b>So sánh sản phẩm</b><br/><img src="ScreenShot_E/shop-compare.png"/></td>
<td><b>Đơn hàng của tôi</b><br/><img src="ScreenShot_E/shop-my-orders.png"/></td>
</tr>
<tr>
<td><b>Voucher của tôi</b><br/><img src="ScreenShot_E/shop-vouchers.png"/></td>
<td><b>Đăng nhập (email / Google)</b><br/><img src="ScreenShot_E/shop-login.png"/></td>
</tr>
</table>

---

## 🛠️ Giao diện trang quản trị

<table>
<tr>
<td width="50%"><b>Bảng điều khiển</b><br/><img src="ScreenShot_E/admin-dashboard.png"/></td>
<td width="50%"><b>Thống kê nâng cao</b><br/><img src="ScreenShot_E/admin-stats.png"/></td>
</tr>
<tr>
<td><b>Quản lý sản phẩm (biến thể)</b><br/><img src="ScreenShot_E/admin-products.png"/></td>
<td><b>Quản lý đơn hàng</b><br/><img src="ScreenShot_E/admin-orders.png"/></td>
</tr>
<tr>
<td><b>Danh mục</b><br/><img src="ScreenShot_E/admin-categories.png"/></td>
<td><b>Mã giảm giá</b><br/><img src="ScreenShot_E/admin-coupons.png"/></td>
</tr>
<tr>
<td><b>Banner trang chủ</b><br/><img src="ScreenShot_E/admin-banners.png"/></td>
<td><b>Bài viết</b><br/><img src="ScreenShot_E/admin-pages.png"/></td>
</tr>
<tr>
<td><b>Phản hồi khách hàng</b><br/><img src="ScreenShot_E/admin-feedback.png"/></td>
<td><b>Cài đặt cửa hàng</b><br/><img src="ScreenShot_E/admin-settings.png"/></td>
</tr>
</table>

### 📦 Kế toán — Kho hàng

<table>
<tr>
<td width="50%"><b>Tổng quan tài chính kho</b><br/><img src="ScreenShot_E/admin-inventory.png"/></td>
<td width="50%"><b>Nhà cung cấp & nhập kho (FIFO)</b><br/><img src="ScreenShot_E/admin-suppliers.png"/></td>
</tr>
<tr>
<td><b>Máy tính định giá động</b><br/><img src="ScreenShot_E/admin-pricing.png"/></td>
<td><b>Đánh giá lại tồn kho (LCNRV)</b><br/><img src="ScreenShot_E/admin-lcnrv.png"/></td>
</tr>
<tr>
<td><b>Phê duyệt HSSV</b><br/><img src="ScreenShot_E/admin-students.png"/></td>
<td><b>Cấu hình kế toán</b><br/><img src="ScreenShot_E/admin-accounting.png"/></td>
</tr>
</table>

---

<div align="center">

Dự án học tập — backend có **chú thích tiếng Việt chi tiết** để dễ theo dõi.

Made with ❤️ để học MERN & bảo mật web.

</div>
