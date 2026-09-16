import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function LoginForm({ onSwitchTab, onForgotPassword }) {
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [emailError, setEmailError] = useState('');
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
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
            const redirect = searchParams.get('redirect');
            if (redirect) {
                navigate(redirect);
            } else {
                navigate('/');
            }
        } catch (err) {
            setFormError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
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
                <div className="password-input-wrap">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => {
                            setLoginForm({ ...loginForm, password: e.target.value });
                            if (formError) setFormError('');
                        }}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        tabIndex={-1}
                    >
                        <Icon name={showPassword ? 'eye-off' : 'eye'} width="18" height="18" />
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

            <div className="auth-foot">
                Chưa có tài khoản? <a onClick={() => onSwitchTab('register')}>Đăng ký ngay</a>
            </div>
        </form>
    );
}