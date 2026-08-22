import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { verifyEmail, resendVerification } from '../../api/authApi';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // 'verifying' | 'success' | 'error'
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendDone, setResendDone] = useState(false);
    const [resendError, setResendError] = useState('');
    const [countdown, setCountdown] = useState(0);

    const calledRef = useRef(false);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Liên kết xác thực không hợp lệ hoặc bị thiếu. Vui lòng kiểm tra lại email của bạn.');
            return;
        }
        (async () => {
            try {
                const result = await verifyEmail(token);
                setStatus('success');
                setMessage(result?.message || 'Email của bạn đã được xác thực thành công.');
            } catch (err) {
                setStatus('error');
                setMessage(err.message || 'Liên kết xác thực đã hết hạn hoặc không hợp lệ.');
            }
        })();
    }, [searchParams]);

    const handleResend = async () => {
        if (countdown > 0) return;
        setResendError('');
        const email = (resendEmail || '').trim();
        if (!email) {
            setResendError('Vui lòng nhập email đã đăng ký.');
            return;
        }
        setResendLoading(true);
        try {
            await resendVerification(email);
            setResendDone(true);
            setCountdown(60);
        } catch (err) {
            setResendError(err.message || 'Không thể gửi lại email xác thực. Vui lòng thử lại sau.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="page active">
            <div className="verify-email-wrap">
                <div className="auth-box" style={{ textAlign: 'center' }}>
                    <a
                        href="#"
                        className="logo"
                        style={{ justifyContent: 'center', marginBottom: 28 }}
                        onClick={(e) => { e.preventDefault(); navigate('/'); }}
                    >
                        <span className="logo-mark">S</span> SkillBridge
                    </a>

                    {status === 'verifying' && (
                        <>
                            <div className="verify-spin" />
                            <h2>Đang xác thực email...</h2>
                            <div className="sub">Vui lòng chờ trong giây lát, chúng tôi đang kiểm tra liên kết của bạn.</div>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="success-tick">
                                <Icon name="check" style={{ width: 28, height: 28, color: 'var(--ink-fixed)' }} />
                            </div>
                            <h2>Xác thực thành công!</h2>
                            <div className="sub">{message}</div>
                            <button className="btn btn-primary btn-block" onClick={() => navigate('/auth?tab=login')}>
                                Đăng nhập ngay
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="error-tick">
                                <Icon name="x" style={{ width: 28, height: 28 }} />
                            </div>
                            <h2>Xác thực thất bại</h2>
                            <div className="sub">{message}</div>

                            {!resendDone ? (
                                <>
                                    <div className="field" style={{ textAlign: 'left' }}>
                                        <label>Gửi lại email xác thực</label>
                                        <input
                                            type="email"
                                            placeholder="ban@fpt.edu.vn"
                                            value={resendEmail}
                                            onChange={(e) => {
                                                setResendEmail(e.target.value);
                                                if (resendError) setResendError('');
                                            }}
                                        />
                                    </div>
                                    {resendError && <div className="field-error" style={{ marginBottom: 12, textAlign: 'left' }}>{resendError}</div>}
                                    <button className="btn btn-primary btn-block" onClick={handleResend} disabled={resendLoading || countdown > 0}>
                                        {resendLoading ? 'Đang gửi...' : countdown > 0 ? `Thử lại sau ${countdown}s` : 'Gửi lại liên kết xác thực'}
                                    </button>
                                </>
                            ) : (
                                <div style={{ marginTop: 12 }}>
                                    <div className="auth-mobile-trust" style={{ display: 'flex', marginBottom: 12 }}>
                                        ✉️ <span>Đã gửi liên kết xác thực mới tới <b>{resendEmail}</b>. Vui lòng kiểm tra hộp thư.</span>
                                    </div>
                                    {countdown > 0 ? (
                                        <div className="sub" style={{ fontSize: 13 }}>Bạn có thể gửi lại sau <b>{countdown}s</b>.</div>
                                    ) : (
                                        <button className="btn btn-outline btn-block" onClick={() => setResendDone(false)}>
                                            Gửi lại email khác
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="auth-foot">
                                <a onClick={() => navigate('/auth?tab=login')}>← Quay lại đăng nhập</a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}