import { useState } from 'react';
import { requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword as resetPasswordApi } from '../../api/authApi';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ForgotPasswordFlow({ onBackToLogin }) {
    const [forgotEmail, setForgotEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [forgotStep, setForgotStep] = useState('email');
    const [forgotOtp, setForgotOtp] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPassword2, setNewPassword2] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewPassword2, setShowNewPassword2] = useState(false);
    const [formError, setFormError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');

    const validateEmail = (value) => {
        if (!value) {
            setEmailError('');
            return;
        }
        setEmailError(EMAIL_REGEX.test(value) ? '' : 'Email không đúng định dạng');
    };

    const resetForgotFlow = () => {
        setForgotStep('email');
        setForgotEmail('');
        setEmailError('');
        setForgotOtp('');
        setResetToken('');
        setNewPassword('');
        setNewPassword2('');
        setShowNewPassword(false);
        setShowNewPassword2(false);
        setFormError('');
        setInfoMessage('');
    };

    const handleRequestOtp = async () => {
        setFormError('');
        setInfoMessage('');
        if (!forgotEmail) {
            setFormError('Vui lòng nhập email.');
            return;
        }
        if (!EMAIL_REGEX.test(forgotEmail)) {
            setEmailError('Email không đúng định dạng');
            return;
        }
        setLoading(true);
        try {
            const result = await requestPasswordResetOtp(forgotEmail);
            setInfoMessage(result.message);
            setForgotStep('otp');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setFormError('');
        setInfoMessage('');
        setLoading(true);
        try {
            const result = await requestPasswordResetOtp(forgotEmail);
            setInfoMessage(result.message);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setFormError('');
        if (!forgotOtp) {
            setFormError('Vui lòng nhập mã OTP.');
            return;
        }
        setLoading(true);
        try {
            const result = await verifyPasswordResetOtp(forgotEmail, forgotOtp);
            setResetToken(result.resetToken);
            setFormError('');
            setInfoMessage('');
            setForgotStep('reset');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setFormError('');
        if (!newPassword || !newPassword2) {
            setFormError('Vui lòng nhập mật khẩu mới.');
            return;
        }
        if (newPassword !== newPassword2) {
            setFormError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (!PASSWORD_REGEX.test(newPassword)) {
            setFormError('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
            return;
        }
        setLoading(true);
        try {
            await resetPasswordApi(resetToken, newPassword);
            resetForgotFlow();
            onBackToLogin();
        } catch (err) {
            setFormError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-form is-active">
            {forgotStep === 'email' && (
                <>
                    <h2>Quên mật khẩu</h2>
                    <div className="sub">Nhập email đã đăng ký — chúng tôi sẽ gửi mã OTP xác thực gồm 6 chữ số.</div>
                    <div className={'field' + (emailError ? ' has-error' : '')}>
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="ban@fpt.edu.vn"
                            value={forgotEmail}
                            onChange={(e) => {
                                setForgotEmail(e.target.value);
                                if (formError) setFormError('');
                            }}
                            onBlur={(e) => validateEmail(e.target.value)}
                        />
                        {emailError && <div className="field-error">{emailError}</div>}
                    </div>
                    {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}
                    <button className="btn btn-primary btn-block" onClick={handleRequestOtp} disabled={loading}>
                        {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                    </button>
                    <div className="auth-foot">
                        <a onClick={() => { resetForgotFlow(); onBackToLogin(); }}>← Quay lại đăng nhập</a>
                    </div>
                </>
            )}

            {forgotStep === 'otp' && (
                <>
                    <h2>Nhập mã OTP</h2>
                    <div className="sub">Mã 6 chữ số đã được gửi tới <b>{forgotEmail}</b>, có hiệu lực trong 10 phút.</div>
                    {infoMessage && <div className="sub" style={{ color: 'var(--success, #16a34a)' }}>{infoMessage}</div>}
                    <div className="field">
                        <label>Mã OTP</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={forgotOtp}
                            onChange={(e) => {
                                setForgotOtp(e.target.value.replace(/\D/g, ''));
                                if (formError) setFormError('');
                            }}
                        />
                    </div>
                    {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}
                    <button className="btn btn-primary btn-block" onClick={handleVerifyOtp} disabled={loading}>
                        {loading ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
                    </button>
                    <div className="auth-foot">
                        <a onClick={handleResendOtp}>Gửi lại mã</a>
                        {' · '}
                        <a onClick={() => { setForgotStep('email'); setFormError(''); setInfoMessage(''); }}>← Nhập email khác</a>
                    </div>
                </>
            )}

            {forgotStep === 'reset' && (
                <>
                    <h2>Đặt mật khẩu mới</h2>
                    <div className="sub">Xác thực thành công. Nhập mật khẩu mới cho tài khoản của bạn.</div>

                    <div className="field">
                        <label>Mật khẩu mới</label>
                        <div className="password-field">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Ít nhất 8 ký tự"
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (formError) setFormError('');
                                }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                tabIndex={-1}
                            >
                                {showNewPassword ? '🙈' : '🐵'}
                            </button>
                        </div>
                        <div className="hint">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (vd: !@#$%).</div>
                    </div>

                    <div className="field">
                        <label>Xác nhận mật khẩu mới</label>
                        <div className="password-field">
                            <input
                                type={showNewPassword2 ? 'text' : 'password'}
                                placeholder="Nhập lại mật khẩu mới"
                                value={newPassword2}
                                onChange={(e) => {
                                    setNewPassword2(e.target.value);
                                    if (formError) setFormError('');
                                }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNewPassword2(!showNewPassword2)}
                                aria-label={showNewPassword2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                tabIndex={-1}
                            >
                                {showNewPassword2 ? '🙈' : '🐵'}
                            </button>
                        </div>
                    </div>

                    {formError && <div className="field-error" style={{ marginBottom: 12 }}>{formError}</div>}

                    <button className="btn btn-primary btn-block" onClick={handleResetPassword} disabled={loading}>
                        {loading ? 'Đang đổi mật khẩu...' : 'Đặt lại mật khẩu'}
                    </button>
                </>
            )}
        </div>
    );
}