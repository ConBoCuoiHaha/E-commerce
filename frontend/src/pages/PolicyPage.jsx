import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../lib/axios.js";

// Trang bài viết "Thông tin hữu ích" - nội dung đọc từ DB (v5).
// Admin sửa nội dung trong dashboard, trang này tự hiện bản mới.

// Render nội dung văn bản theo quy ước:
//   "### Tiêu đề"  -> <h3>
//   "- gạch đầu dòng" -> <li>
//   còn lại -> đoạn văn
// (Không dùng dangerouslySetInnerHTML -> không có cửa cho XSS từ nội dung)
function renderContent(content) {
  const blocks = [];
  let currentList = [];

  const flushList = (key) => {
    if (currentList.length > 0) {
      blocks.push(<ul key={`ul-${key}`}>{currentList}</ul>);
      currentList = [];
    }
  };

  content.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (line.startsWith("### ")) {
      flushList(i);
      blocks.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      currentList.push(<li key={i}>{line.slice(2)}</li>);
    } else {
      flushList(i);
      blocks.push(<p key={i}>{line}</p>);
    }
  });
  flushList("end");
  return blocks;
}

export default function PolicyPage() {
  const { slug } = useParams();
  const [menu, setMenu] = useState([]);
  const [page, setPage] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get("/pages").then((r) => setMenu(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(null);
    setNotFound(false);
    api
      .get(`/pages/${slug}`)
      .then((r) => setPage(r.data))
      .catch(() => setNotFound(true));
  }, [slug]);

  return (
    <div className="policy-layout">
      <aside className="sidebar">
        <div className="facet-group">
          <h4>Thông tin hữu ích</h4>
          {menu.map((m) => (
            <Link
              key={m.slug}
              to={`/chinh-sach/${m.slug}`}
              className="admin-link"
              style={slug === m.slug ? { background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600 } : {}}
            >
              {m.title}
            </Link>
          ))}
        </div>
      </aside>

      <article className="policy-content">
        {notFound && <p className="error-text">Không tìm thấy bài viết</p>}
        {!page && !notFound && <p className="info-text">Đang tải...</p>}
        {page && (
          <>
            <h1>{page.title}</h1>
            {renderContent(page.content)}
          </>
        )}
      </article>
    </div>
  );
}
