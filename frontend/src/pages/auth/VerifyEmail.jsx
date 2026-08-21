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

    const calledRef = useRef(false);

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
        if (!resendEmail) {
            alert('Vui lòng nhập email đã đăng ký.');
            return;
        }
        setResendLoading(true);
        try {
            await resendVerification(resendEmail);
            setResendDone(true);
        } catch (err) {
            alert(err.message);
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
                                            onChange={(e) => setResendEmail(e.target.value)}
                                        />
                                    </div>
                                    <button className="btn btn-primary btn-block" onClick={handleResend} disabled={resendLoading}>
                                        {resendLoading ? 'Đang gửi...' : 'Gửi lại liên kết xác thực'}
                                    </button>
                                </>
                            ) : (
                                <div className="auth-mobile-trust" style={{ display: 'flex', marginTop: 4 }}>
                                    ✉️ <span>Đã gửi liên kết xác thực mới tới <b>{resendEmail}</b>. Vui lòng kiểm tra hộp thư.</span>
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