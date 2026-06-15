import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// App QUẢN TRỊ chạy cổng RIÊNG 5174, TÁCH KHỎI web bán hàng (5173)
// nhằm bảo mật: mã nguồn trang quản trị KHÔNG bị bundle/serve chung
// với web khách. Vẫn dùng CHUNG backend (proxy /api -> cổng 5000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
