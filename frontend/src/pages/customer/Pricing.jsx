import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useStore } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

export default function Pricing() {
  const [tab, setTab] = useState('student');
  const { state, upgradeVip } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  return (
    <div className="page active">
      <div className="pricing-hero wrap">
        <div className="sec-eyebrow" style={{ textAlign: 'center' }}>Bảng giá</div>
        <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', marginBottom: 12 }}>Chọn gói phù hợp với bạn</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: 520, margin: '0 auto' }}>Miễn phí để bắt đầu — nâng cấp khi bạn cần thêm lợi thế cạnh tranh.</p>
        <div className="pricing-toggle">
          <button className={tab === 'student' ? 'is-active' : ''} onClick={() => setTab('student')}>Dành cho sinh viên</button>
          <button className={tab === 'employer' ? 'is-active' : ''} onClick={() => setTab('employer')}>Dành cho nhà tuyển dụng</button>
        </div>
      </div>

      <div className="pricing-body wrap">
        <div className={'price-set' + (tab === 'student' ? ' is-active' : '')}>
          <div className="price-card">
            <h4>Free</h4>
            <div className="price-desc">Đủ dùng để bắt đầu tìm việc đầu tiên</div>
            <div className="price-amt">0đ<span>/tháng</span></div>
            <div className="price-sub">Không cần thẻ thanh toán</div>
            <ul className="price-feat">
              <li><Icon name="check" /> Ứng tuyển không giới hạn</li>
              <li><Icon name="check" /> Hồ sơ & portfolio cơ bản</li>
              <li><Icon name="check" /> Bảo vệ bởi Quỹ Bảo hiểm Tương hỗ</li>
            </ul>
            <button
              className="btn btn-outline btn-block"
              onClick={() => navigate(state.currentUser ? '/jobs' : '/auth?tab=register')}
            >
              {state.currentUser ? (state.subscriptionPro ? 'Chuyển về Free' : '✓ Gói hiện tại') : 'Bắt đầu miễn phí'}
            </button>
          </div>

          <div className="price-card popular">
            <div className="price-ribbon">Phổ biến nhất</div>
            <h4>Freelance Pro</h4>
            <div className="price-desc">Cho sinh viên muốn chủ động chọn việc tốt nhất</div>
            <div className="price-amt">49.000đ<span>/tháng</span></div>
            <div className="price-sub">Hủy bất cứ lúc nào</div>
            <ul className="price-feat">
              <li><Icon name="check" /> Truy cập sớm 20 phút với việc lương cao</li>
              <li><Icon name="check" /> Xếp hạng ưu tiên trong tìm kiếm</li>
              <li><Icon name="check" /> Gợi ý việc bằng AI theo kỹ năng</li>
              <li><Icon name="check" /> Huy hiệu Premium xác thực</li>
              <li><Icon name="check" /> Báo cáo hiệu suất ứng tuyển</li>
            </ul>
            <button className="btn btn-primary btn-block" disabled={state.subscriptionPro} onClick={() => openModal('subscribe')}>
              {state.subscriptionPro ? '✓ Đã là thành viên Pro' : 'Nâng cấp Pro'}
            </button>
          </div>

          <div className="price-card">
            <h4>Gold Tier</h4>
            <div className="price-desc">Tự động mở khoá khi Reliability & lịch sử đủ tốt</div>
            <div className="price-amt">Miễn phí<span> · theo cấp bậc</span></div>
            <div className="price-sub">Không mất phí, do thành tích quyết định</div>
            <ul className="price-feat">
              <li><Icon name="check" /> Top hiển thị trong kết quả tìm kiếm</li>
              <li><Icon name="check" /> Huy hiệu Gold nổi bật trên hồ sơ</li>
              <li><Icon name="check" /> Ưu tiên mời vào việc dài hạn</li>
            </ul>
            <button className="btn btn-outline btn-block" onClick={() => navigate('/profile')}>Xem tiêu chí đạt Gold</button>
          </div>
        </div>

        <div className={'price-set' + (tab === 'employer' ? ' is-active' : '')}>
          <div className="price-card">
            <h4>Standard</h4>
            <div className="price-desc">Cho cá nhân kinh doanh, shop online</div>
            <div className="price-amt">10%<span>/công việc</span></div>
            <div className="price-sub">Chỉ trả khi hoàn thành công việc</div>
            <ul className="price-feat">
              <li><Icon name="check" /> 3 tin đăng đầu miễn phí hoa hồng</li>
              <li><Icon name="check" /> Ghép việc dưới 15 phút</li>
              <li><Icon name="check" /> Ứng viên đã xác thực đại học</li>
            </ul>
            <button className="btn btn-outline btn-block" onClick={() => navigate('/post-job')}>Đăng tin miễn phí</button>
          </div>

          <div className="price-card popular">
            <div className="price-ribbon">Tiết kiệm nhất</div>
            <h4>VIP Business Suite</h4>
            <div className="price-desc">Cho agency & nhà tuyển dụng &gt;15 việc/tháng</div>
            <div className="price-amt">5%<span>/công việc</span></div>
            <div className="price-sub">Giảm một nửa phí hoa hồng</div>
            <ul className="price-feat">
              <li><Icon name="check" /> Hoa hồng giảm từ 10% xuống 5%</li>
              <li><Icon name="check" /> Bảng điều khiển ghép ứng viên hàng loạt</li>
              <li><Icon name="check" /> Featured Listing miễn phí hàng tháng</li>
              <li><Icon name="check" /> Quản lý nhóm sub-contracting</li>
            </ul>
            <button className="btn btn-primary btn-block" disabled={state.vipBusiness} onClick={upgradeVip}>
              {state.vipBusiness ? '✓ Đã là VIP Business' : 'Nâng cấp ngay'}
            </button>
          </div>

          <div className="price-card">
            <h4>Enterprise Affiliate</h4>
            <div className="price-desc">Cho doanh nghiệp lớn cần tuyển số lượng</div>
            <div className="price-amt">$0.10<span>/lượt click</span></div>
            <div className="price-sub">Thanh toán theo hiệu suất</div>
            <ul className="price-feat">
              <li><Icon name="check" /> 50 lượt click chất lượng cao miễn phí</li>
              <li><Icon name="check" /> One-Touch Portfolio Generator</li>
              <li><Icon name="check" /> Không cần đàm phán từng việc</li>
            </ul>
            <button className="btn btn-outline btn-block" onClick={() => navigate('/dashboard')}>Liên hệ đội ngũ Enterprise</button>
          </div>
        </div>

        <div className="cpc-note">Mọi mức phí được tham chiếu từ mô hình doanh thu SkillBridge: phí giao dịch 5–10%, Featured Listing 20.000đ, Premium 49.000đ/tháng và Affiliate CPC $0.10 cho đối tác doanh nghiệp.</div>
      </div>
    </div>
  );
}
