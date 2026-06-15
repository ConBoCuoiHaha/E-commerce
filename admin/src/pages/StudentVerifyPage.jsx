import { useEffect, useState } from "react";
import api from "../lib/axios.js";

// PHÊ DUYỆT HSSV (v10-P3): kế toán xem ảnh thẻ, nhập ngày hết hạn, duyệt/từ chối.
const STATUS_LABEL = {
  pending: { text: "Chờ duyệt", cls: "s-pending" },
  approved: { text: "Đã duyệt", cls: "s-delivered" },
  rejected: { text: "Từ chối", cls: "s-cancelled" },
  expired: { text: "Hết hạn", cls: "s-cancelled" },
};

export default function StudentVerifyPage() {
  const [filter, setFilter] = useState("pending");
  const [list, setList] = useState([]);
  const [expiryMap, setExpiryMap] = useState({}); // id -> ngày hết hạn nhập tay
  const [msg, setMsg] = useState("");

  const load = () =>
    api.get("/membership/student-requests", { params: { status: filter } }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [filter]);

  const approve = async (u) => {
    const expiry = expiryMap[u._id];
    if (!expiry) { alert("Vui lòng nhập ngày hết hạn thẻ trước khi duyệt"); return; }
    try {
      const res = await api.put(`/membership/student-requests/${u._id}/approve`, { studentCardExpiry: expiry });
      setMsg(res.data.message);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi duyệt");
    }
  };

  const reject = async (u) => {
    const reason = prompt("Lý do từ chối:", "Ảnh thẻ không rõ, vui lòng tải lại");
    if (reason === null) return;
    await api.put(`/membership/student-requests/${u._id}/reject`, { reason });
    load();
  };

  return (
    <div>
      <h1>Phê duyệt HSSV</h1>
      {msg && <p className="success-text">{msg}</p>}

      <div className="toolbar">
        <div className="form-row">
          {["pending", "approved", "all"].map((f) => (
            <button key={f} className={`btn btn-sm ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "pending" ? "Chờ duyệt" : f === "approved" ? "Đã duyệt" : "Tất cả"}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && <p className="info-text">Không có yêu cầu nào</p>}

      {list.map((u) => {
        const st = STATUS_LABEL[u.studentStatus] || { text: u.studentStatus, cls: "" };
        return (
          <div key={u._id} className="order-card">
            <div className="order-head">
              <span><b>{u.name}</b> (@{u.username}) · {u.email}</span>
              <span className={`status-chip ${st.cls}`}>{st.text}</span>
            </div>
            {u.studentCardImage && (
              <a href={u.studentCardImage} target="_blank" rel="noreferrer">
                <img src={u.studentCardImage} alt="thẻ HSSV" style={{ maxWidth: 280, borderRadius: 8, border: "1px solid var(--border)", marginTop: 6 }} />
              </a>
            )}
            {u.studentStatus === "approved" && (
              <p className="meta">Hết hạn: {new Date(u.studentCardExpiry).toLocaleDateString("vi-VN")}</p>
            )}
            {u.studentStatus === "pending" && (
              <div className="form-row" style={{ marginTop: 8, alignItems: "flex-end" }}>
                <label className="field">Ngày hết hạn thẻ
                  <input type="date" value={expiryMap[u._id] || ""} onChange={(e) => setExpiryMap({ ...expiryMap, [u._id]: e.target.value })} />
                </label>
                <button className="btn btn-primary btn-sm" onClick={() => approve(u)}>Duyệt</button>
                <button className="btn btn-sm" onClick={() => reject(u)}>Từ chối</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
