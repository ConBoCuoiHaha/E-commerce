import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { GOOGLE_CLIENT_ID } from "../lib/googleConfig.js";

// Nút "Đăng nhập với Google" dùng Google Identity Services (GIS).
// Cách hoạt động:
//   1. Nạp script GIS của Google (1 lần cho cả app).
//   2. google.accounts.id.initialize: khai báo Client ID + hàm callback.
//   3. renderButton: Google tự vẽ nút chính chủ vào thẻ div.
//   4. User bấm -> Google trả về "credential" (ID token) -> ta gửi lên
//      backend POST /api/auth/google để xác minh và đăng nhập.
//
// Script GIS được nạp động (không nhúng cứng trong index.html) để
// component tự quản lý vòng đời.
//
// SỬA CẢNH BÁO "initialize() is called multiple times":
// initialize() chỉ nên gọi 1 LẦN cho cả app, nhưng callback bên trong
// cần dữ liệu MỚI NHẤT (navigate, loginWithGoogle của lần mount hiện
// tại). Giải pháp: initialize 1 lần với callback "vỏ" gọi qua biến
// module currentCallback - mỗi lần component mount chỉ cập nhật biến này.
let gisPromise = null;
let gisInitialized = false;
let currentCallback = null;
const loadGis = () => {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    // Đã có sẵn (vd quay lại trang) thì dùng luôn
    if (window.google?.accounts?.id) return resolve();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Không tải được Google Sign-In"));
    document.head.appendChild(script);
  });
  return gisPromise;
};

export default function GoogleSignInButton({ onError }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const divRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // Cập nhật callback cho lần mount HIỆN TẠI (initialize chỉ chạy 1 lần)
    currentCallback = async (response) => {
      try {
        await loginWithGoogle(response.credential);
        navigate("/"); // đăng nhập xong -> về trang chủ
      } catch (err) {
        onError?.(err.response?.data?.message || "Đăng nhập Google thất bại");
      }
    };

    loadGis()
      .then(() => {
        if (cancelled || !divRef.current) return;

        if (!gisInitialized) {
          gisInitialized = true;
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            // Callback "vỏ": luôn gọi callback mới nhất qua biến module
            callback: (response) => currentCallback?.(response),
          });
        }

        // renderButton thì gọi mỗi lần mount (div mới) - không sao
        window.google.accounts.id.renderButton(divRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          locale: "vi",
        });
      })
      .catch((err) => onError?.(err.message));

    return () => { cancelled = true; };
  }, [loginWithGoogle, navigate, onError]);

  return <div ref={divRef} style={{ display: "flex", justifyContent: "center" }} />;
}
