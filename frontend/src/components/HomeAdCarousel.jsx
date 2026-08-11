import { useEffect, useState } from 'react';
import { adsPool } from '../data/ads';

export default function HomeAdCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % adsPool.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const ad = adsPool[index];

  const showAdDemo = () => {
    alert(
      `Đây là bản demo — quảng cáo của "${ad.sponsor}" minh hoạ mô hình Affiliate CPC. Nhà tuyển dụng trả 2.400đ (~$0.10) cho mỗi lượt click như thế này, và hồ sơ của bạn sẽ được gửi tự động qua One-Touch Portfolio Generator.`
    );
  };

  return (
    <>
      <div className="home-ad reveal" onClick={showAdDemo}>
        <span className="home-ad-label">📢 Quảng cáo · Được tài trợ</span>
        <div className="home-ad-logo" style={{ background: ad.grad }} />
        <div className="home-ad-body">
          <h4>{ad.title}</h4>
          <p>{ad.desc}</p>
        </div>
        <div className="home-ad-cta"><b>Xem chi tiết →</b>Quảng cáo Affiliate CPC</div>
      </div>
      <div className="ad-dots">
        {adsPool.map((_, i) => (
          <button
            key={i}
            className={i === index ? 'is-active' : ''}
            aria-label={`Quảng cáo ${i + 1}`}
            onClick={(e) => { e.stopPropagation(); setIndex(i); }}
          />
        ))}
      </div>
    </>
  );
}
