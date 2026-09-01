import { useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordFlow from './ForgotPasswordFlow';

export default function Auth({ forcedTab }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const tab = useMemo(() => {
    if (forcedTab) return forcedTab;
    const p = location.pathname;
    if (p === '/register' || p === '/auth/register') return 'register';
    if (p === '/forgot-password' || p === '/auth/forgot-password' || p === '/auth/forgot') return 'forgot';
    if (p === '/login' || p === '/auth/login') return 'login';
    const queryTab = searchParams.get('tab');
    if (queryTab && ['login', 'register', 'forgot'].includes(queryTab)) return queryTab;
    return 'login';
  }, [forcedTab, location.pathname, searchParams]);

  const switchTab = (nextTab) => {
    if (nextTab === 'login') navigate('/login');
    else if (nextTab === 'register') navigate('/register');
    else if (nextTab === 'forgot') navigate('/forgot-password');
  };

  return (
    <div className="page active">
      <div className="auth-shell">
        <div className="auth-side">
          <div>
            <a href="#" className="logo" style={{ color: '#fff' }} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <span className="logo-mark">S</span> SkillBridge
            </a>
          </div>

          <div className="auth-side-mid">
            <div className="auth-eyebrow"><span className="dot" /> Dành riêng cho sinh viên Việt Nam</div>
            <h1 className="auth-headline">Việc làm thật.<br />Thu nhập <span>thật</span>.</h1>
            <p className="auth-sub">Micro-job ngắn hạn, xác thực bằng email trường, ghép việc trong dưới 15 phút — không cần kinh nghiệm dày dạn để bắt đầu.</p>

            <div className="auth-stats-row">
              <div className="auth-stat"><b>71.4%</b><span>tìm việc qua Facebook Group trước khi biết SkillBridge</span></div>
              <div className="auth-stat"><b>&lt;15 phút</b><span>thời gian ghép việc trung bình</span></div>
              <div className="auth-stat"><b>88.8%</b><span>sinh viên sẵn sàng nâng cấp Premium</span></div>
            </div>

            <div className="auth-live-stack" aria-hidden="true">
              <div className="auth-live-card c1">
                <Avatar name="Trà Sữa Mộc" className="alc-av" fontSize={13} />
                <div className="alc-main"><b>Trà Sữa Mộc</b><span>vừa đăng tin · 2 phút trước</span></div>
                <div className="alc-price">250K</div>
              </div>
              <div className="auth-live-card c2">
                <Avatar name="Minh Anh" className="alc-av" fontSize={13} />
                <div className="alc-main"><b>Minh Anh</b><span>vừa được thuê · Video Editing</span></div>
                <div className="alc-price">🎉</div>
              </div>
            </div>
          </div>

          <div>
            <div className="auth-quote">
              "Chỉ trong <span>3 ngày</span> đăng ký, mình đã nhận công việc dựng video đầu tiên và có bài trong portfolio."
            </div>
            <div className="auth-person">
              <Avatar name="Tường Vy" className="av" fontSize={16} />
              <div><b>Tường Vy</b><span>Sinh viên FPT University</span></div>
            </div>
          </div>
        </div>

        <div className="auth-form-col">
          <div className="auth-box">
            <a href="#" className="back-home" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              <Icon name="chevleft" style={{ width: 14, height: 14 }} /> Về trang chủ
            </a>
            <div className="auth-mobile-trust">
              🎓 <span><b>Xác thực qua email trường</b> · Ghép việc dưới 15 phút · Bảo vệ bởi Quỹ Bảo hiểm Tương hỗ</span>
            </div>

            {tab !== 'forgot' && (
              <div className="auth-tabs">
                <button className={'auth-tab' + (tab === 'login' ? ' is-active' : '')} onClick={() => switchTab('login')}>Đăng nhập</button>
                <button className={'auth-tab' + (tab === 'register' ? ' is-active' : '')} onClick={() => switchTab('register')}>Đăng ký</button>
              </div>
            )}

            {tab === 'login' && <LoginForm onSwitchTab={switchTab} onForgotPassword={() => switchTab('forgot')} />}
            {tab === 'register' && <RegisterForm onSwitchTab={switchTab} />}
            {tab === 'forgot' && <ForgotPasswordFlow onBackToLogin={() => switchTab('login')} />}
          </div>
        </div>
      </div>
    </div>
  );
}