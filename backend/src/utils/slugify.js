// ============================================================
// SLUGIFY.JS - CHUYỂN TÊN TIẾNG VIỆT THÀNH SLUG CHO URL
// ------------------------------------------------------------
// Vd: "Điện thoại iPhone 15 Pro!" -> "dien-thoai-iphone-15-pro"
// Tự viết thay vì cài thư viện để bạn hiểu cách xử lý chuỗi,
// và xử lý đúng tiếng Việt (đ -> d).
// ============================================================

export const slugify = (text) => {
  return (
    text
      .toString()
      .toLowerCase()
      // normalize("NFD"): tách ký tự có dấu thành ký tự gốc + dấu rời
      // vd: "ế" -> "e" + dấu sắc + dấu mũ
      .normalize("NFD")
      // Xóa toàn bộ các ký tự dấu vừa tách ra (khoảng unicode U+0300-U+036f)
      .replace(/[̀-ͯ]/g, "")
      // Riêng chữ "đ" không thuộc nhóm trên, phải thay thủ công
      .replace(/đ/g, "d")
      // Thay mọi ký tự KHÔNG phải chữ/số thành dấu gạch ngang
      .replace(/[^a-z0-9]+/g, "-")
      // Xóa gạch ngang thừa ở đầu/cuối
      .replace(/^-+|-+$/g, "")
  );
};

// Tạo slug duy nhất: nếu slug đã tồn tại trong collection thì gắn thêm
// chuỗi ngẫu nhiên ngắn phía sau (vd: "iphone-15" -> "iphone-15-x7k2")
export const uniqueSlug = async (Model, name) => {
  let slug = slugify(name);
  // exists(): query nhẹ chỉ kiểm tra có document khớp hay không
  const existed = await Model.exists({ slug });
  if (existed) {
    const random = Math.random().toString(36).substring(2, 6); // 4 ký tự ngẫu nhiên
    slug = `${slug}-${random}`;
  }
  return slug;
};
