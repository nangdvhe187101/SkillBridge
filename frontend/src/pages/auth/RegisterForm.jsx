import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import Icon from '../../components/Icon';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PHONE_REGEX = /^0\d{9}$/;

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
        const email = (value || '').trim();
        if (!email) {
            setEmailError('');
            return;
        }
        setEmailError(EMAIL_REGEX.test(email) ? '' : 'Email không đúng định dạng');
    };

    const validatePhone = (value) => {
        const phone = (value || '').trim();
        if (!phone) return true;
        return PHONE_REGEX.test(phone);
    };

    const updateField = (patch) => {
        setRegForm((prev) => ({ ...prev, ...patch }));
        if (formError) setFormError('');
    };

    const handleRegister = async () => {
        setFormError('');
        const name = (regForm.name || '').trim();
        const email = (regForm.email || '').trim();
        const password = regForm.password || '';
        const password2 = regForm.password2 || '';
        const phone = (regForm.phone || '').trim();

        if (!name) {
            setFormError(role === 'student' ? 'Vui lòng nhập họ và tên.' : 'Vui lòng nhập tên công ty/doanh nghiệp.');
            return;
        }

        if (!email) {
            setFormError('Vui lòng nhập email.');
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            setFormError('Email không đúng định dạng.');
            return;
        }

        if (phone && !validatePhone(phone)) {
            setFormError('Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0).');
            return;
        }

        if (!password) {
            setFormError('Vui lòng nhập mật khẩu.');
            return;
        }
        if (!PASSWORD_REGEX.test(password)) {
            setFormError('Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
            return;
        }

        if (password !== password2) {
            setFormError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);
        try {
            const res = await doRegister({
                fullName: name,
                email,
                password,
                phone: phone || undefined,
                role
            });
            setRegisterMessage(res?.message || 'Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.');
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
        <form className="auth-form is-active" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
            <h2>Tạo tài khoản mới</h2>

            <div className="role-toggle">
                <button
                    type="button"
                    className={'role-opt' + (role === 'student' ? ' is-active' : '')}
                    onClick={() => setRole('student')}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="graduation" width="16" height="16" /> Sinh viên
                    </span>
                </button>
                <button
                    type="button"
                    className={'role-opt' + (role === 'employer' ? ' is-active' : '')}
                    onClick={() => setRole('employer')}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Icon name="building" width="16" height="16" /> Nhà tuyển dụng
                    </span>
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
                    maxLength={10}
                    placeholder="0xxxxxxxxx"
                    value={regForm.phone}
                    onChange={(e) => updateField({ phone: e.target.value.replace(/\D/g, '') })}
                />
                <div className="hint">10 chữ số, bắt đầu bằng số 0.</div>
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
                        <Icon name={showPassword ? 'eye-off' : 'eye'} width="18" height="18" />
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
                        <Icon name={showPassword2 ? 'eye-off' : 'eye'} width="18" height="18" />
                    </button>
                </div>
            </div>

            {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>

            <div className="auth-foot">
                Đã có tài khoản? <a onClick={() => onSwitchTab('login')}>Đăng nhập</a>
            </div>
        </form>
    );
}