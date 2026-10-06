import { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const DEFAULT_CLIENT_ID = '275431712095-73cfhprsdt4seghbdrjr4clpl9f7j6g7.apps.googleusercontent.com';

export default function GoogleLoginButton({ roleCode = 'student', mode = 'login', text = 'Tiếp tục với Google', onError }) {
    const { googleLogin } = useStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const googleButtonRef = useRef(null);
    const hasRenderedRef = useRef(false);

    // Lưu các callbacks & props vào ref để tránh kích hoạt useEffect liên tục khi component cha re-render
    const googleLoginRef = useRef(googleLogin);
    googleLoginRef.current = googleLogin;

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const roleCodeRef = useRef(roleCode);
    roleCodeRef.current = roleCode;

    const modeRef = useRef(mode);
    modeRef.current = mode;

    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;

    const searchParamsRef = useRef(searchParams);
    searchParamsRef.current = searchParams;

    const locationRef = useRef(location);
    locationRef.current = location;

    const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

    useEffect(() => {
        let isMounted = true;
        hasRenderedRef.current = false;

        const handleCredentialResponse = async (response) => {
            if (!response?.credential) {
                if (onErrorRef.current) onErrorRef.current('Không nhận được mã xác thực từ Google.');
                return;
            }

            setLoading(true);
            try {
                await googleLoginRef.current(response.credential, roleCodeRef.current, modeRef.current);
                const redirect = searchParamsRef.current?.get('redirect') || locationRef.current?.state?.from;
                if (redirect) {
                    navigateRef.current(redirect, { replace: true });
                } else {
                    navigateRef.current('/');
                }
            } catch (err) {
                if (onErrorRef.current) {
                    onErrorRef.current(err.message || (modeRef.current === 'register' ? 'Đăng ký Google thất bại. Vui lòng thử lại.' : 'Đăng nhập Google thất bại. Vui lòng thử lại.'));
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Hàm khởi tạo Google Identity Services
        const initGsi = () => {
            if (window.google?.accounts?.id && googleButtonRef.current) {
                if (hasRenderedRef.current && googleButtonRef.current.hasChildNodes()) {
                    return; // Đã render rồi thì giữ nguyên, không render lại để tránh nhấp nháy
                }

                try {
                    window.google.accounts.id.initialize({
                        client_id: clientId,
                        callback: handleCredentialResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });

                    googleButtonRef.current.innerHTML = '';
                    window.google.accounts.id.renderButton(googleButtonRef.current, {
                        theme: 'outline',
                        size: 'large',
                        width: 360,
                        text: mode === 'register' ? 'signup_with' : 'signin_with',
                        shape: 'rectangular',
                        logo_alignment: 'left',
                        locale: 'vi',
                    });

                    hasRenderedRef.current = true;
                } catch (e) {
                    console.warn('GSI render error:', e);
                }
            }
        };

        if (window.google?.accounts?.id) {
            initGsi();
        } else {
            // Nạp script nếu chưa có
            const existingScript = document.getElementById('google-gsi-client');
            if (!existingScript) {
                const script = document.createElement('script');
                script.id = 'google-gsi-client';
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    if (isMounted) initGsi();
                };
                document.head.appendChild(script);
            } else {
                existingScript.addEventListener('load', initGsi);
            }
        }

        return () => {
            isMounted = false;
        };
    }, [clientId, text, mode, roleCode]);

    return (
        <div className="google-sso-container" style={{ width: '100%', marginTop: 12, marginBottom: 12 }}>
            {/* Vùng render chuẩn của Google */}
            <div
                ref={googleButtonRef}
                style={{
                    width: '100%',
                    minHeight: 44,
                    display: 'flex',
                    justifyContent: 'center',
                    pointerEvents: loading ? 'none' : 'auto',
                    opacity: loading ? 0.6 : 1,
                }}
            />
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 6 }}>
                {mode === 'register' ? (
                    roleCode === 'employer' ? (
                        <i>🏢 Đăng ký tài khoản Nhà tuyển dụng nhanh bằng Google</i>
                    ) : (
                        <i>🎓 Đăng ký tài khoản Sinh viên bằng Google (Gmail hoặc Email trường)</i>
                    )
                ) : (
                    <i>🔐 Đăng nhập nhanh bằng Google cho Sinh viên & Nhà tuyển dụng</i>
                )}
            </div>
            {loading && (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#2563eb', marginTop: 4 }}>
                    Đang xác thực tài khoản Google...
                </div>
            )}
        </div>
    );
}
