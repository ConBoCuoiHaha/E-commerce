import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone, MapPin, EnvelopeSimple, X,
  FacebookLogo, YoutubeLogo, TiktokLogo,
} from "@phosphor-icons/react";
import api from "../lib/axios.js";

// Footer ĐỘNG (v5): hotline, địa chỉ, copyright, danh sách bài viết...
// tất cả đọc từ API (admin sửa trong dashboard, không cần sửa code).
// -> Shop đổi địa điểm kinh doanh chỉ cần vào Cài đặt đổi 1 dòng.

// Form phản hồi dạng modal - POST /api/feedback
function FeedbackModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await api.post("/feedback", form);
      setStatus("done");
      setMsg(res.data.message);
    } catch (err) {
      setStatus("error");
      setMsg(err.response?.data?.message || "Gửi thất bại, vui lòng thử lại");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Gửi phản hồi, góp ý</h3>
          <button className="modal-close" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        </div>
        {status === "done" ? (
          <p className="success-text">{msg}</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {status === "error" && <p className="error-text">{msg}</p>}
            <input required name="name" placeholder="Họ tên của bạn" value={form.name} onChange={handleChange} />
            <input required type="email" name="email" placeholder="Email để chúng tôi phản hồi" value={form.email} onChange={handleChange} />
            <textarea required minLength={10} name="message" placeholder="Nội dung góp ý (ít nhất 10 ký tự)..." value={form.message} onChange={handleChange} />
            <button className="btn btn-primary" disabled={status === "sending"}>
              {status === "sending" ? "Đang gửi..." : "Gửi góp ý"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Footer() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [setting, setSetting] = useState(null);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    api.get("/settings").then((r) => setSetting(r.data)).catch(() => {});
    api.get("/pages").then((r) => setPages(r.data)).catch(() => {});
  }, []);

  if (!setting) return null; // chưa tải xong cấu hình thì chưa vẽ footer

  const fullAddress = `${setting.storeAddress}, ${setting.storeCity}`;
  const mapUrl =
    "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(fullAddress);

  return (
    <>
      <svg className="wave-divider" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0 13 Q 15 0, 30 13 T 60 13 T 90 13 T 120 13 T 150 13 T 180 13 T 210 13 T 240 13 T 270 13 T 300 13 T 330 13 T 360 13 T 390 13 T 420 13 T 450 13 T 480 13 T 510 13 T 540 13 T 570 13 T 600 13 T 630 13 T 660 13 T 690 13 T 720 13 T 750 13 T 780 13 T 810 13 T 840 13 T 870 13 T 900 13 T 930 13 T 960 13 T 990 13 T 1020 13 T 1050 13 T 1080 13 T 1110 13 T 1140 13 T 1170 13 T 1200 13"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        />
      </svg>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-col">
            <Link to="/" className="brand">Hung<span>SaiGon</span></Link>
            <div className="social-row">
              {setting.facebook && <a href={setting.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><FacebookLogo size={19} /></a>}
              {setting.youtube && <a href={setting.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><YoutubeLogo size={19} /></a>}
              {setting.tiktok && <a href={setting.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><TiktokLogo size={19} /></a>}
            </div>
          </div>

          <div className="footer-col">
            <h4>Hotline</h4>
            <p><Phone size={16} /> {setting.hotline}</p>
            <h4 style={{ marginTop: 14 }}>Cửa hàng {setting.storeCity}</h4>
            <p>
              <MapPin size={16} />
              <span>
                {fullAddress}{" "}
                <a href={mapUrl} target="_blank" rel="noreferrer" className="link" style={{ display: "inline", padding: 0 }}>
                  (Chỉ đường)
                </a>
              </span>
            </p>
          </div>

          <div className="footer-col">
            <h4>Thông tin hữu ích</h4>
            {pages.map((p) => (
              <Link key={p.slug} to={`/chinh-sach/${p.slug}`}>{p.title}</Link>
            ))}
          </div>

          <div className="footer-col">
            <h4>Phản hồi, góp ý</h4>
            <p style={{ paddingBottom: 10 }}>
              Đội ngũ Kiểm Soát Chất Lượng của chúng tôi sẵn sàng lắng nghe quý khách.
            </p>
            <button className="btn btn-dark" onClick={() => setShowFeedback(true)}>
              <EnvelopeSimple size={18} /> Gửi phản hồi
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          {setting.copyright}
          <br />
          Địa chỉ: {fullAddress} · Email: {setting.email}
        </div>
      </footer>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
