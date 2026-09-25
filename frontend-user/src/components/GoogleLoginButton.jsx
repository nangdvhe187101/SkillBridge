import { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const DEFAULT_CLIENT_ID = '337920152554-4vptlhk19d146p69i3j0ck5bflsqe4r9.apps.googleusercontent.com'; // Dự phòng hoặc đọc từ env

export default function GoogleLoginButton({ roleCode = 'student', text = 'Tiếp tục với Google', onError }) {
    const { googleLogin } = useStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const googleButtonRef = useRef(null);

    const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;

    useEffect(() => {
        let isMounted = true;

        const handleCredentialResponse = async (response) => {
            if (!response?.credential) {
                if (onError) onError('Không nhận được mã xác thực từ Google.');
                return;
            }

            setLoading(true);
            try {
                await googleLogin(response.credential, roleCode);
                const redirect = searchParams.get('redirect');
                if (redirect) {
                    navigate(redirect);
                } else {
                    navigate('/');
                }
            } catch (err) {
                if (onError) {
                    onError(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        // Hàm khởi tạo Google Identity Services
        const initGsi = () => {
            if (window.google?.accounts?.id) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: clientId,
                        callback: handleCredentialResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });

                    if (googleButtonRef.current) {
                        window.google.accounts.id.renderButton(googleButtonRef.current, {
                            theme: 'outline',
                            size: 'large',
                            width: '100%',
                            text: text.includes('Đăng ký') ? 'signup_with' : 'signin_with',
                            shape: 'rectangular',
                            logo_alignment: 'left',
                            locale: 'vi',
                        });
                    }
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
    }, [clientId, roleCode, text, navigate, searchParams, googleLogin, onError]);

    // Trình kích hoạt đăng nhập dạng popup tùy biến khi người dùng bấm
    const handleCustomClick = () => {
        if (loading) return;
        if (window.google?.accounts?.id) {
            window.google.accounts.id.prompt();
        }
    };

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
            {loading && (
                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted, #64748b)', marginTop: 6 }}>
                    Đang kết nối tài khoản Google...
                </div>
            )}
        </div>
    );
}
