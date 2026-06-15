import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy: mọi request bắt đầu bằng /api từ frontend (cổng 5173)
// sẽ được Vite chuyển tiếp sang backend (cổng 5000).
// Nhờ vậy frontend và backend "như cùng một origin" -> cookie
// sameSite=strict hoạt động bình thường, không lo CORS khi dev.
export default defineConfig({
  plugins: [react()],
  server: {
    // COOP "same-origin-allow-popups": cho phép popup Google Sign-In
    // gửi postMessage về trang -> hết cảnh báo "Cross-Origin-Opener-
    // Policy would block the window.postMessage call". (Header này phải
    // do server phục vụ TRANG HTML gửi = Vite dev, không phải Express.)
    headers: { "Cross-Origin-Opener-Policy": "same-origin-allow-popups" },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
