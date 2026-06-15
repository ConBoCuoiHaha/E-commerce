import { useEffect, useState } from "react";
import api from "../lib/axios.js";

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get("/feedback").then((r) => setFeedbacks(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resolve = async (id) => {
    await api.put(`/feedback/${id}/resolve`);
    load();
  };

  if (loading) return <p className="info-text">Đang tải...</p>;

  return (
    <div>
      <h1>Phản hồi, góp ý ({feedbacks.length})</h1>
      {feedbacks.length === 0 && <p className="info-text">Chưa có phản hồi nào</p>}
      {feedbacks.map((f) => (
        <div key={f._id} className="order-card">
          <div className="order-head">
            <span>
              <b>{f.name}</b> · <a href={`mailto:${f.email}`} className="link">{f.email}</a>
              <span className="meta"> · {new Date(f.createdAt).toLocaleString("vi-VN")}</span>
            </span>
            <span className={`status-chip ${f.isResolved ? "s-delivered" : "s-pending"}`}>
              {f.isResolved ? "Đã xử lý" : "Chờ xử lý"}
            </span>
          </div>
          <p>{f.message}</p>
          {!f.isResolved && (
            <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => resolve(f._id)}>
              Đánh dấu đã xử lý
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
