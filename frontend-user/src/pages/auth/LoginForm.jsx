import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';
import GoogleLoginButton from '../../components/GoogleLoginButton';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function LoginForm({ onSwitchTab, onForgotPassword }) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login: doLogin } = useStore();

  const validateEmail = (value) => {
    const email = (value || '').trim();
    if (!email) {
      setEmailError('');
      return true;
    }
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Email không hợp lệ (VD: ten@gmail.com)');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateEmail(loginForm.email)) {
      return;
    }

    if (!loginForm.email || !loginForm.password) {
      setFormError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      await doLogin(loginForm.email, loginForm.password);
      const redirect = searchParams.get('redirect') || location.state?.from;
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        navigate('/');
      }
    } catch (err) {
      setFormError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = (e) => {
    setTimeout(() => {
      e.target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  };

  return (
    <form className="auth-form is-active" onSubmit={handleSubmit}>
      <h2>Chào bạn quay lại</h2>
      <div className="sub">Đăng nhập để tiếp tục tìm việc hoặc đăng tin.</div>

      <div className={'field' + (emailError ? ' has-error' : '')}>
        <label>Email</label>
        <input
          type="email"
          placeholder="ban@email.com"
          value={loginForm.email}
          onFocus={handleInputFocus}
          onChange={(e) => {
            setLoginForm({ ...loginForm, email: e.target.value });
            if (emailError) validateEmail(e.target.value);
            if (formError) setFormError('');
          }}
          onBlur={(e) => validateEmail(e.target.value)}
        />
        {emailError && <div className="field-error">{emailError}</div>}
      </div>

      <div className="field">
        <label>Mật khẩu</label>
        <div className="password-field password-input-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={loginForm.password}
            onFocus={handleInputFocus}
            onChange={(e) => {
              setLoginForm({ ...loginForm, password: e.target.value });
              if (formError) setFormError('');
            }}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} width="20" height="20" />
          </button>
        </div>
      </div>

      <div className="auth-link-row">
        <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }}>Quên mật khẩu?</a>
      </div>

      {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}

      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>

      <div className="auth-separator" style={{ display: 'flex', alignItems: 'center', margin: '20px 0 14px', color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border, #e2e8f0)' }} />
        <span style={{ padding: '0 12px' }}>hoặc tiếp tục với</span>
        <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border, #e2e8f0)' }} />
      </div>

      <GoogleLoginButton roleCode="student" onError={(msg) => setFormError(msg)} />

      <div className="auth-foot">
        Chưa có tài khoản? <a onClick={() => onSwitchTab('register')}>Đăng ký ngay</a>
      </div>
    </form>
  );
}