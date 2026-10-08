import { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { getPublicSystemConfigs } from '../../api/authApi';
import Icon from '../../components/Icon';
import GoogleLoginButton from '../../components/GoogleLoginButton';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PHONE_REGEX = /^0\d{9}$/;

export default function RegisterForm({ onSwitchTab }) {
    const [role, setRole] = useState('student');
    const [regForm, setRegForm] = useState({ name: '', email: '', password: '', password2: '', phone: '', referralCode: '' });
    const [publicConfigs, setPublicConfigs] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);
    const [registerMessage, setRegisterMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const { register: doRegister } = useStore();

    useEffect(() => {
        getPublicSystemConfigs().then((cfg) => {
            if (cfg) setPublicConfigs(cfg);
        });

        // Tự động nhận diện mã giới thiệu từ URL nếu bạn bè gửi link (vd: ?ref=KJHXMT)
        try {
            const params = new URLSearchParams(window.location.search);
            const ref = params.get('ref');
            if (ref) {
                const cleanRef = ref.trim().toUpperCase();
                setRegForm((prev) => ({ ...prev, referralCode: cleanRef }));
                sessionStorage.setItem('sb_pending_referral_code', cleanRef);
            }
        } catch {}
    }, []);

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
                phoneNumber: phone || undefined,
                role,
                roleCode: role,
                referralCode: regForm.referralCode?.trim() || undefined,
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

    const handleInputFocus = (e) => {
        setTimeout(() => {
            e.target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 280);
    };

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
                <label htmlFor="reg-name">{role === 'student' ? 'Họ và tên' : 'Tên công ty/doanh nghiệp'}</label>
                <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder={role === 'student' ? 'Nguyễn Văn A' : 'Công ty TNHH ABC Solutions'}
                    value={regForm.name}
                    onChange={(e) => updateField({ name: e.target.value })}
                />
                {role === 'student' && (
                    <div className="hint" style={{ color: '#6366f1', fontSize: '0.8rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>💡</span>
                        <span>Vui lòng nhập đúng Họ và Tên theo CCCD để thuận tiện liên kết ngân hàng và rút tiền sau này.</span>
                    </div>
                )}
            </div>

            <div className={'field' + (emailError ? ' has-error' : '')}>
                <label htmlFor="reg-email">{role === 'student' ? 'Email sinh viên / cá nhân' : 'Email công ty'}</label>
                <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder={role === 'student' ? 'ban@fpt.edu.vn hoặc ban@gmail.com' : 'hr@congty.vn'}
                    value={regForm.email}
                    onChange={(e) => updateField({ email: e.target.value })}
                    onBlur={(e) => validateEmail(e.target.value)}
                />
                {emailError && <div className="field-error">{emailError}</div>}
            </div>

            <div className="field">
                <label htmlFor="reg-phone">Số điện thoại (tuỳ chọn)</label>
                <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="0xxxxxxxxx"
                    value={regForm.phone}
                    onChange={(e) => updateField({ phone: e.target.value.replace(/\D/g, '') })}
                />
                <div className="hint">10 chữ số, bắt đầu bằng số 0.</div>
            </div>

            <div className="field">
                <label htmlFor="reg-password">Mật khẩu</label>
                <div className="password-field">
                    <input
                        id="reg-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Ít nhất 8 ký tự"
                        value={regForm.password}
                        onFocus={handleInputFocus}
                        onChange={(e) => updateField({ password: e.target.value })}
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
                <div className="hint">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</div>
            </div>

            <div className="field">
                <label htmlFor="reg-password2">Xác nhận mật khẩu</label>
                <div className="password-field">
                    <input
                        id="reg-password2"
                        name="password_confirm"
                        type={showPassword2 ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu"
                        value={regForm.password2}
                        onFocus={handleInputFocus}
                        onChange={(e) => updateField({ password2: e.target.value })}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword2(!showPassword2)}
                        title={showPassword2 ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                        aria-label={showPassword2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        tabIndex={-1}
                    >
                        <Icon name={showPassword2 ? 'eye-off' : 'eye'} width="20" height="20" />
                    </button>
                </div>
            </div>

            {/* Trường Mã Giới Thiệu Bạn Bè (1-1): Tự động ẨN HOÀN TOÀN nếu Admin TẮT trong cài đặt */}
            {publicConfigs?.referralProgramEnabled && (
                <div className="field">
                    <label htmlFor="reg-referral-code" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Mã giới thiệu bạn đồng hành</span>
                        <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>Vé mời 1 - 1</span>
                    </label>
                    <input
                        id="reg-referral-code"
                        name="referral_code"
                        type="text"
                        maxLength={6}
                        placeholder="VD: KJHXMT (6 chữ cái ngẫu nhiên)"
                        style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}
                        value={regForm.referralCode}
                        onChange={(e) => updateField({ referralCode: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                    />
                    <div className="hint" style={{ color: '#0ea5e9', fontWeight: 600, marginTop: 4 }}>
                        🎁 {publicConfigs.referralRewardType === 'trial_days'
                            ? `Nhận ngay ${publicConfigs.referralRewardValue} ngày trải nghiệm Gói Talent VIP khi bạn hoàn tất xác minh tài khoản!`
                            : `Được miễn 100% hoa hồng sàn cho ${publicConfigs.referralRewardValue} hợp đồng đầu tiên!`}
                    </div>
                </div>
            )}

            {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
            </button>

            <div className="auth-separator" style={{ display: 'flex', alignItems: 'center', margin: '20px 0 14px', color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border, #e2e8f0)' }} />
                <span style={{ padding: '0 12px' }}>hoặc tiếp tục với</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border, #e2e8f0)' }} />
            </div>

            <GoogleLoginButton
                key={role}
                roleCode={role}
                mode="register"
                text={role === 'employer' ? "Đăng ký Nhà tuyển dụng với Google" : "Đăng ký Sinh viên với Google"}
                referralCode={regForm.referralCode}
                onError={(msg) => setFormError(msg)}
            />

            <div className="auth-foot">
                Đã có tài khoản? <a onClick={() => onSwitchTab('login')}>Đăng nhập</a>
            </div>
        </form>
    );
}