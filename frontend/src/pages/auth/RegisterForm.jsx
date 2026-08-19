import { useState } from 'react';
import { useStore } from '../../context/StoreContext';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PHONE_REGEX = /^0\d{9,10}$/;

export default function RegisterForm({ onSwitchTab }) {
    const [role, setRole] = useState('student');
    const [regForm, setRegForm] = useState({ name: '', email: '', password: '', password2: '', phone: '' });
    const [emailError, setEmailError] = useState('');
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registerMessage, setRegisterMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const { register: doRegister } = useStore();

    const validateEmail = (value) => {
        if (!value) {
            setEmailError('');
            return;
        }
        setEmailError(EMAIL_REGEX.test(value) ? '' : 'Email không đúng định dạng');
    };

    const updateField = (patch) => {
        setRegForm((prev) => ({ ...prev, ...patch }));
        if (formError) setFormError('');
    };

    const handleRegister = async () => {
        setFormError('');
        if (!regForm.name || !regForm.email || !regForm.password) {
            setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.');
            return;
        }
        if (!EMAIL_REGEX.test(regForm.email)) {
            setEmailError('Email không đúng định dạng');
            return;
        }
        if (regForm.password !== regForm.password2) {
            setFormError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (!PASSWORD_REGEX.test(regForm.password)) {
            setFormError('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
            return;
        }
        if (regForm.phone && !PHONE_REGEX.test(regForm.phone)) {
            setFormError('Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0.');
            return;
        }
        setLoading(true);
        try {
            const result = await doRegister(
                regForm.name,
                regForm.email,
                regForm.password,
                regForm.phone || null,
                role
            );
            setRegisterMessage(result.message);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (registerMessage) {
        return (
            <div className="auth-form is-active">
                <h2>Đăng ký thành công</h2>
                <div className="sub">{registerMessage}</div>
                <button className="btn btn-primary btn-block" onClick={() => { onSwitchTab('login'); setRegisterMessage(''); }}>
                    Đến trang đăng nhập
                </button>
            </div>
        );
    }

    return (
        <div className="auth-form is-active">
            <h2>Tạo tài khoản mới</h2>

            <div className="role-toggle">
                <button
                    type="button"
                    className={'role-opt' + (role === 'student' ? ' is-active' : '')}
                    onClick={() => setRole('student')}
                >
                    🎓 Sinh viên
                </button>
                <button
                    type="button"
                    className={'role-opt' + (role === 'employer' ? ' is-active' : '')}
                    onClick={() => setRole('employer')}
                >
                    🏢 Nhà tuyển dụng
                </button>
            </div>

            <div className="field">
                <label>{role === 'student' ? 'Họ và tên' : 'Tên công ty/doanh nghiệp'}</label>
                <input
                    type="text"
                    placeholder={role === 'student' ? 'Nguyễn Văn A' : 'Công ty TNHH ABC Solutions'}
                    value={regForm.name}
                    onChange={(e) => updateField({ name: e.target.value })}
                />
            </div>

            <div className={'field' + (emailError ? ' has-error' : '')}>
                <label>{role === 'student' ? 'Email đại học' : 'Email công ty'}</label>
                <input
                    type="email"
                    placeholder={role === 'student' ? 'ban@fpt.edu.vn' : 'hr@congty.vn'}
                    value={regForm.email}
                    onChange={(e) => updateField({ email: e.target.value })}
                    onBlur={(e) => validateEmail(e.target.value)}
                />
                {emailError && <div className="field-error">{emailError}</div>}
            </div>

            <div className="field">
                <label>Số điện thoại (tuỳ chọn)</label>
                <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="0xxxxxxxxx"
                    value={regForm.phone}
                    onChange={(e) => updateField({ phone: e.target.value.replace(/\D/g, '') })}
                />
                <div className="hint">10-11 chữ số, bắt đầu bằng số 0.</div>
            </div>

            <div className="field">
                <label>Mật khẩu</label>
                <div className="password-field">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Ít nhất 8 ký tự"
                        value={regForm.password}
                        onChange={(e) => updateField({ password: e.target.value })}
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
                <div className="hint">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</div>
            </div>

            <div className="field">
                <label>Xác nhận mật khẩu</label>
                <div className="password-field">
                    <input
                        type={showPassword2 ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu"
                        value={regForm.password2}
                        onChange={(e) => updateField({ password2: e.target.value })}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword2(!showPassword2)}
                        aria-label={showPassword2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        tabIndex={-1}
                    >
                        {showPassword2 ? '🙈' : '🐵'}
                    </button>
                </div>
            </div>

            {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}

            <button className="btn btn-primary btn-block" onClick={handleRegister} disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>

            <div className="auth-foot">
                Đã có tài khoản? <a onClick={() => onSwitchTab('login')}>Đăng nhập</a>
            </div>
        </div>
    );
}