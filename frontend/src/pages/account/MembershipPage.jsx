import { useEffect, useState } from "react";
import { Crown, GraduationCap, SealCheck, Clock, XCircle } from "@phosphor-icons/react";
import api from "../../lib/axios.js";
import UploadInput from "../../components/UploadInput.jsx";
import { formatVND } from "../../components/ProductCard.jsx";
import { usePageMeta } from "../../lib/usePageMeta.js";

// TRANG THÀNH VIÊN (v10-P3): hạng VIP + tiến độ tích lũy + xác minh HSSV.
const TIER_LABEL = { "H-NEW": "Thành viên mới", "H-MEM": "VIP Bạc", "H-VIP": "VIP Vàng" };

export default function MembershipPage() {
  usePageMeta("Thành viên");
  const [m, setM] = useState(null);
  const [cardImage, setCardImage] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = () => api.get("/membership/me").then((r) => setM(r.data));
  useEffect(() => { load(); }, []);

  const submitCard = async () => {
    setMsg(""); setError("");
    if (!cardImage) { setError("Vui lòng tải ảnh thẻ HSSV"); return; }
    try {
      const res = await api.post("/membership/student-request", { studentCardImage: cardImage });
      setMsg(res.data.message);
      setCardImage("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Gửi yêu cầu thất bại");
    }
  };

  if (!m) return <p className="info-text">Đang tải...</p>;

  // Tiến độ tới hạng kế tiếp
  const next = m.vipTier === "H-NEW" ? m.memThreshold : m.vipTier === "H-MEM" ? m.vipThreshold : null;
  const progress = next ? Math.min(100, Math.round((m.accumulatedSpending / next) * 100)) : 100;

  return (
    <div>
      <h1>Thành viên & ưu đãi</h1>

      {/* Hạng VIP */}
      <div className="order-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Crown size={26} color="var(--accent)" weight="fill" />
          <div>
            <b style={{ fontSize: 16 }}>{TIER_LABEL[m.vipTier]}</b>
            <div className="meta">Chi tiêu tích lũy: {formatVND(m.accumulatedSpending)}</div>
          </div>
        </div>
        {next ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 8, background: "var(--bg)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)" }} />
            </div>
            <p className="meta" style={{ marginTop: 6 }}>
              Còn {formatVND(Math.max(0, next - m.accumulatedSpending))} để lên hạng tiếp theo
            </p>
          </div>
        ) : (
          <p className="meta" style={{ marginTop: 8 }}>Bạn đang ở hạng cao nhất!</p>
        )}
      </div>

      {/* Xác minh HSSV */}
      <h2 style={{ marginTop: 18 }}>
        <GraduationCap size={20} style={{ verticalAlign: "-3px" }} /> Ưu đãi Học sinh - Sinh viên
      </h2>

      <div className="order-card">
        {m.studentStatus === "approved" && m.isStudentActive && (
          <p className="success-text">
            <SealCheck size={16} style={{ verticalAlign: "-2px" }} /> Đã xác minh HSSV — hiệu lực đến{" "}
            {new Date(m.studentCardExpiry).toLocaleDateString("vi-VN")}. Ưu đãi tự áp khi thanh toán.
          </p>
        )}
        {m.studentStatus === "pending" && (
          <p className="meta">
            <Clock size={16} style={{ verticalAlign: "-2px" }} /> Yêu cầu đang chờ kế toán duyệt...
          </p>
        )}
        {m.studentStatus === "expired" && (
          <p className="error-text">
            <XCircle size={16} style={{ verticalAlign: "-2px" }} /> Thẻ HSSV đã hết hạn. Tải thẻ mới để gia hạn ưu đãi.
          </p>
        )}
        {m.studentStatus === "rejected" && (
          <p className="error-text">
            <XCircle size={16} style={{ verticalAlign: "-2px" }} /> Yêu cầu bị từ chối: {m.studentRejectReason}
          </p>
        )}

        {/* Form tải thẻ - hiện khi chưa duyệt / hết hạn / bị từ chối */}
        {["none", "expired", "rejected"].includes(m.studentStatus) && (
          <div style={{ marginTop: 10 }}>
            {msg && <p className="success-text">{msg}</p>}
            {error && <p className="error-text">{error}</p>}
            <p className="meta" style={{ marginBottom: 8 }}>
              Tải ảnh thẻ học sinh/sinh viên còn hiệu lực. Kế toán sẽ duyệt và nhập ngày hết hạn.
            </p>
            <UploadInput value={cardImage} onUploaded={setCardImage} placeholder="Ảnh thẻ HSSV (JPG/PNG/WEBP)" />
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={submitCard}>
              Gửi yêu cầu xác minh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
