import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default function LoginForm({ onSwitchTab, onForgotPassword }) {
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [emailError, setEmailError] = useState('');
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login: doLogin } = useStore();

    const validateEmail = (value) => {
        if (!value) {
            setEmailError('');
            return;
        }
        setEmailError(EMAIL_REGEX.test(value) ? '' : 'Email không đúng định dạng');
    };

    const handleLogin = async () => {
        setFormError('');
        if (!loginForm.email || !loginForm.password) {
            setFormError('Vui lòng nhập email và mật khẩu.');
            return;
        }
        if (!EMAIL_REGEX.test(loginForm.email)) {
            setEmailError('Email không đúng định dạng');
            return;
        }
        setLoading(true);
        try {
            await doLogin(loginForm.email, loginForm.password);
            navigate('/');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-form is-active">
            <h2>Chào bạn quay lại</h2>
            <div className="sub">Đăng nhập để tiếp tục tìm việc hoặc đăng tin.</div>

            <div className={'field' + (emailError ? ' has-error' : '')}>
                <label>Email</label>
                <input
                    type="email"
                    placeholder="ban@fpt.edu.vn"
                    value={loginForm.email}
                    onChange={(e) => {
                        setLoginForm({ ...loginForm, email: e.target.value });
                        if (formError) setFormError('');
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                />
                {emailError && <div className="field-error">{emailError}</div>}
            </div>

            <div className="field">
                <label>Mật khẩu</label>
                <div className="password-field">
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
                        {showPassword ? '🙈' : '🐵'}
                    </button>
                </div>
            </div>

            <div className="auth-link-row">
                <a href="#" onClick={(e) => { e.preventDefault(); onForgotPassword(); }}>Quên mật khẩu?</a>
            </div>

            {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}

            <button className="btn btn-primary btn-block" onClick={handleLogin} disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <div className="auth-foot">
                Chưa có tài khoản? <a onClick={() => onSwitchTab('register')}>Đăng ký ngay</a>
            </div>
        </div>
    );
}