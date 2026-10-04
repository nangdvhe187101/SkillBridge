import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordFlow from './ForgotPasswordFlow';
import { useStore } from '../../context/StoreContext';

export default function Auth({ forcedTab }) {
  const { state } = useStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!state.isInitializing && state.currentUser) {
      const from = location.state?.from;
      if (from && from !== '/auth' && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
      } else if (state.currentUser.roleCode === 'employer' || state.role === 'employer') {
        navigate('/employer/dashboard', { replace: true });
      } else {
        navigate('/jobs', { replace: true });
      }
    }
  }, [state.isInitializing, state.currentUser, state.role, navigate, location.state]);

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
          <img
            src="/auth-3d-hero.jpg"
            alt="SkillBridge - Nền tảng Micro-job cho sinh viên"
            className="auth-hero-img"
          />
          <div className="auth-side-fade" aria-hidden="true" />
        </div>

        <div className="auth-form-col">
          <div className="auth-box">
            <div className="auth-box-header">
              <a href="#" className="logo auth-box-logo" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                <span className="logo-mark">S</span> SkillBridge
              </a>
              <a href="#" className="back-home" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                <Icon name="chevleft" style={{ width: 14, height: 14 }} /> Về trang chủ
              </a>
            </div>
            <div className="auth-mobile-trust" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="graduation" width="16" height="16" style={{ flexShrink: 0 }} />
              <span><b>Xác thực qua email trường</b> · Ghép việc dưới 15 phút · Bảo vệ bởi Quỹ Bảo hiểm Tương hỗ</span>
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