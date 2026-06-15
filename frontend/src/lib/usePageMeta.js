import { useEffect } from "react";

// Hook SEO: đổi <title> + meta description THEO TỪNG TRANG.
// SPA chỉ có 1 file index.html -> nếu không làm việc này, mọi trang
// đều chung 1 tiêu đề, Google index kém và tab trình duyệt khó phân biệt.
// (Google bot có chạy JavaScript nên đọc được tiêu đề động này;
//  còn preview Zalo/Messenger chỉ đọc thẻ OG TĨNH trong index.html -
//  muốn preview riêng từng sản phẩm thì cần SSR, đã ghi chú trong YeuCau.md)
const BASE = "HungSaiGon";

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : `${BASE} - Laptop & Thiết bị công nghệ chính hãng`;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", description);
    }

    // Rời trang -> trả lại tiêu đề mặc định (cleanup)
    return () => {
      document.title = `${BASE} - Laptop & Thiết bị công nghệ chính hãng`;
    };
  }, [title, description]);
}
