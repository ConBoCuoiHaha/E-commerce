import axios from "axios";

// Instance axios dùng chung toàn app.
// baseURL "/api": Vite proxy chuyển tới backend cổng 5000.
// withCredentials: gửi kèm cookie (chứa JWT) trong mọi request.
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ------------------------------------------------------------
// TỰ LÀM MỚI PHIÊN (interceptor) - vá lỗ hổng luồng dữ liệu:
// Access token chỉ sống 15 phút. Không có đoạn này, người dùng đang
// lướt web quá 15 phút thì MỌI thao tác (thêm giỏ, đặt hàng...) bắt
// đầu lỗi 401 cho tới khi reload trang - trải nghiệm rất tệ.
//
// Cách hoạt động:
//   1. Request nào đó nhận 401 -> thử gọi /auth/refresh ĐÚNG 1 LẦN
//      (cờ _retried chống lặp vô hạn nếu refresh cũng 401)
//   2. Refresh OK (cookie access mới đã được set) -> GỌI LẠI request gốc
//   3. Refresh fail (refresh token cũng hết hạn) -> trả lỗi như cũ,
//      AuthContext sẽ coi như chưa đăng nhập
//
// Nhiều request 401 cùng lúc chỉ nên refresh 1 lần -> dùng biến
// refreshPromise dùng chung: request đến sau "xếp hàng" chờ cùng
// 1 lời gọi refresh thay vì mỗi đứa tự gọi.
// ------------------------------------------------------------
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response, // thành công -> cho qua
  async (error) => {
    const original = error.config;

    const is401 = error.response?.status === 401;
    // Không retry với: chính các route auth (login sai là sai thật,
    // refresh fail là hết phiên thật) và request đã retry rồi
    const isAuthRoute = original?.url?.startsWith("/auth/");

    if (is401 && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        // Gom mọi request 401 đồng thời vào CÙNG 1 lời gọi refresh
        refreshPromise = refreshPromise || api.post("/auth/refresh");
        await refreshPromise;
        refreshPromise = null;
        return api(original); // gọi lại request gốc với cookie mới
      } catch {
        refreshPromise = null;
        // Refresh cũng fail -> phiên hết hiệu lực THẬT SỰ. Xóa CỜ PHIÊN
        // để lần tải trang sau AuthContext không dò /auth/me nữa và coi
        // như đã đăng xuất -> hết chuỗi 401 đỏ lặp lại trong console.
        localStorage.removeItem("hsg_session");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
