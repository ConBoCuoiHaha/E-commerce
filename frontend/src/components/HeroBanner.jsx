import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import api from "../lib/axios.js";

// Slide mặc định khi admin chưa tạo banner nào trong dashboard
const DEFAULT_SLIDE = {
  _id: "default",
  title: "Cùng HungSaiGon mở khóa deal công nghệ",
  subtitle: "Ưu đãi đến 40% · Giảm thêm 200K cho học sinh - sinh viên",
  link: "/products",
  buttonLabel: "Khám phá ngay",
  image: "",
};

// Banner carousel: slide lấy từ API /banners (admin quản lý),
// tự chạy 5 giây/slide, có mũi tên + chấm điều hướng.
// Slide không có ảnh -> vẽ nền trang trí (mây, vòng ưu đãi, họa tiết).
export default function HeroBanner() {
  const [slides, setSlides] = useState([DEFAULT_SLIDE]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api.get("/banners").then((res) => {
      if (res.data.length > 0) setSlides(res.data);
    }).catch(() => {});
  }, []);

  // Tự động chuyển slide mỗi 5 giây (chỉ khi có nhiều hơn 1 slide)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(timer); // dọn timer khi unmount
  }, [slides]);

  const slide = slides[idx];
  const go = (delta) => setIdx((i) => (i + delta + slides.length) % slides.length);

  return (
    <div className="hero">
      {/* Nền: ảnh thật nếu banner có ảnh, không thì họa tiết trang trí */}
      {slide.image ? (
        <img className="hero-img" src={slide.image} alt={slide.title} />
      ) : (
        <>
          <span className="cloud c1" /><span className="cloud c2" /><span className="cloud c3" />
          <span className="deco d1" /><span className="deco d2" /><span className="deco d3" />
          <div className="promo-circle p1"><span className="small">Ưu đãi</span><span className="big">40%</span></div>
          <div className="promo-circle p2"><span className="small">Giảm</span><span className="big">200K</span><span className="small">cho HS/SV</span></div>
        </>
      )}

      <h1 style={{ position: "relative", zIndex: 2 }}>{slide.title}</h1>
      {slide.subtitle && <p>{slide.subtitle}</p>}
      <Link to={slide.link || "/products"} className="btn">{slide.buttonLabel || "Xem ngay"}</Link>

      {slides.length > 1 && (
        <>
          <button className="hero-nav prev" onClick={() => go(-1)} aria-label="Slide trước">
            <CaretLeft size={18} weight="bold" />
          </button>
          <button className="hero-nav next" onClick={() => go(1)} aria-label="Slide sau">
            <CaretRight size={18} weight="bold" />
          </button>
          <div className="hero-dots">
            {slides.map((s, i) => (
              <button key={s._id} className={i === idx ? "on" : ""} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
