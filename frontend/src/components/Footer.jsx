import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export default function Footer() {
  const navigate = useNavigate();
  return (
    <footer>
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img
                src="/logo.png"
                alt="SkillBridge Logo"
                style={{ height: 40, width: 'auto', borderRadius: 8, objectFit: 'contain' }}
              />
              <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--ink)' }}>SkillBridge</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              Micro-jobs. Connect. Sustainable. — Nền tảng việc làm vi mô kết nối sinh viên và doanh nghiệp với cơ chế Ký quỹ Escrow và Quỹ Bảo hiểm cộng đồng.
            </p>
            <div className="social-row">
              <a className="social-ico" href="#" aria-label="Facebook"><Icon name="fb" /></a>
              <a className="social-ico" href="#" aria-label="Instagram"><Icon name="ig" /></a>
              <a className="social-ico" href="#" aria-label="TikTok"><Icon name="tiktok" /></a>
            </div>
          </div>
          <div className="fcol">
            <h5>Sản phẩm</h5>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/jobs'); }}>Tìm việc</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/post-job'); }}>Đăng tin tuyển dụng</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}>Bảng giá</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/profile'); }}>Hồ sơ mẫu</a></li>
            </ul>
          </div>
          <div className="fcol">
            <h5>Công ty</h5>
            <ul>
              <li><a href="#">Về chúng tôi</a></li>
              <li><a href="#">Tuyển dụng</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Liên hệ đối tác</a></li>
            </ul>
          </div>
          <div className="fcol">
            <h5>Hỗ trợ</h5>
            <ul>
              <li><a href="#">Trung tâm trợ giúp</a></li>
              <li><a href="#">Quy trình giải quyết tranh chấp</a></li>
              <li><a href="#">Quỹ Bảo hiểm Tương hỗ</a></li>
              <li><a href="#">Liên hệ hỗ trợ</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="fnote">© 2026 SkillBridge · Bản demo phục vụ mục đích thuyết trình học phần</div>
          <div className="footer-legal">
            <a href="#">Điều khoản dịch vụ</a>
            <a href="#">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
