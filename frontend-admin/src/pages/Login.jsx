import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, adminVerify2Fa, adminEnroll2Fa } from '../api/authApi';
import { setAccessToken } from '../api/tokenStore';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [tempSession, setTempSession] = useState(null); // { tempToken, email, userId }
  const [totpCode, setTotpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isWarmupSlow, setIsWarmupSlow] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSuccess = (data) => {
    const token = data.accessToken || data.token;
    if (!token) {
      throw new Error('Không nhận được token xác thực từ server.');
    }

    setAccessToken(token);
    localStorage.setItem('admin_user', JSON.stringify({
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      roleCode: data.roleCode,
      avatarUrl: data.avatarUrl,
      token: token,
    }));

    showToast(`Xin chào ${data.fullName || 'Quản Trị Viên'}!`, 'check');
    navigate('/', { replace: true });
  };

  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    setIsWarmupSlow(false);
    setError('');
    const slowTimer = setTimeout(() => {
      setIsWarmupSlow(true);
    }, 3500);

    try {
      const data = await adminLogin(email.trim(), password);

      // 2FA bắt buộc: đã bật thì nhập mã, chưa bật thì phải thiết lập ngay (BR-SEC-01)
      if (data.requiresTwoFactor || data.requiresTwoFactorSetup) {
        setTempSession({
          tempToken: data.tempToken,
          email: data.email || email.trim(),
          userId: data.userId,
          qrCodeUri: data.qrCodeUri,
          manualEntryKey: data.manualEntryKey
        });
        setStep(data.requiresTwoFactorSetup ? 'enroll' : '2fa');
        setTotpCode('');
        setError('');
        showToast(data.message || 'Vui lòng nhập mã TOTP từ ứng dụng Authenticator', 'info');
        return;
      }

      throw new Error('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.');
    } catch (err) {
      setError(err.message || 'Thông tin đăng nhập không đúng.');
    } finally {
      clearTimeout(slowTimer);
      setIsWarmupSlow(false);
      setLoading(false);
    }
  };

  const handleVerify2FaSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = totpCode.replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã xác thực TOTP');
      return;
    }

    if (!tempSession?.tempToken) {
      setError('Phiên xác thực đã hết hạn, vui lòng quay lại đăng nhập.');
      setStep('credentials');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = step === 'enroll'
        ? await adminEnroll2Fa(tempSession.tempToken, cleanCode)
        : await adminVerify2Fa(tempSession.tempToken, cleanCode);
      handleLoginSuccess(data);
    } catch (err) {
      const msg = err.message || 'Mã xác thực 2FA không chính xác hoặc đã hết hạn.';
      if (err.data?.sessionExpired) {
        handleBackToCredentials();
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTempSession(null);
    setTotpCode('');
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        padding: 20,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#fff',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108, 76, 255, 0.25) 0%, rgba(108, 76, 255, 0) 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '20%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0) 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />

      {/* Main Glass Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 440,
          background: 'rgba(30, 41, 59, 0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div
            style={{
              display: 'inline-flex',
              padding: 6,
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(108, 76, 255, 0.35)',
              marginBottom: 16
            }}
          >
            <img
              src="/logo.png"
              alt="SkillBridge Logo"
              style={{ height: 48, width: 'auto', display: 'block' }}
            />
          </div>
          <h2
            style={{
              fontSize: 23,
              fontWeight: 700,
              margin: '0 0 6px 0',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.02em',
              color: '#ffffff'
            }}
          >
            SkillBridge Control Center
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8' }}>
            Cổng quản trị bảo mật dành riêng cho Quản Trị Viên
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 20,
              fontSize: 13.5,
              color: '#fda4af',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleSubmitCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label
                htmlFor="admin-email"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#e2e8f0' }}
              >
                Email Quản trị
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#818cf8';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#e2e8f0' }}
              >
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#818cf8';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 10,
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: loading
                  ? '#4f46e5'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                fontSize: 14.5,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(79, 70, 229, 0.45)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="adm-spinner" />
                  <span>Đang xác thực bảo mật...</span>
                </>
              ) : (
                <span>Đăng nhập Quản Trị</span>
              )}
            </button>

            {isWarmupSlow && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#a5b4fc',
                  fontSize: 12.5,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                ⚡ Máy chủ Admin đang khởi động lần đầu, vui lòng đợi trong giây lát...
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerify2FaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '16px 14px', borderRadius: 16, border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <div style={{ display: 'inline-flex', padding: 10, borderRadius: 12, background: 'rgba(99, 102, 241, 0.2)', marginBottom: 8, color: '#a5b4fc' }}>
                <Icon name="shield-check" width="28" height="28" />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                {step === 'enroll' ? 'Bắt buộc thiết lập xác thực hai bước' : 'Xác thực hai bước (2FA TOTP)'}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>
                {step === 'enroll'
                  ? <>Quét mã QR bên dưới bằng <strong>Google Authenticator</strong> cho tài khoản <strong>{tempSession?.email}</strong>, rồi nhập mã 6 số để kích hoạt.</>
                  : <>Mở ứng dụng <strong>Google Authenticator</strong> trên điện thoại và nhập mã bảo mật 6 số cho tài khoản <strong>{tempSession?.email}</strong>.</>}
              </p>
            </div>

            {step === 'enroll' && (
              <div style={{ textAlign: 'center' }}>
                {tempSession?.qrCodeUri && (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(tempSession.qrCodeUri)}`}
                    alt="Mã QR thiết lập Google Authenticator"
                    width={180}
                    height={180}
                    style={{ background: '#fff', padding: 8, borderRadius: 12 }}
                  />
                )}
                {tempSession?.manualEntryKey && (
                  <div style={{ marginTop: 10, fontSize: 12.5, color: '#cbd5e1' }}>
                    Hoặc nhập khóa thủ công:
                    <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 13.5, color: '#fff', wordBreak: 'break-all' }}>
                      {tempSession.manualEntryKey}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="totp-code"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#e2e8f0', textAlign: 'center' }}
              >
                Mã xác thực 6 chữ số
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setTotpCode(val);
                }}
                placeholder="••••••"
                required
                autoFocus
                autoComplete="one-time-code"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px',
                  borderRadius: 14,
                  border: '2px solid rgba(99, 102, 241, 0.4)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#fff',
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: '12px',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#818cf8';
                  e.target.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.35)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.trim().length !== 6}
              style={{
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: (loading || totpCode.trim().length !== 6)
                  ? '#475569'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                fontSize: 14.5,
                fontWeight: 700,
                cursor: (loading || totpCode.trim().length !== 6) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || totpCode.trim().length !== 6) ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="adm-spinner" />
                  <span>Đang đối soát mã 2FA...</span>
                </>
              ) : (
                <span>Xác nhận &amp; Đăng nhập</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                padding: 6,
                textDecoration: 'underline'
              }}
            >
              ← Quay lại đăng nhập bằng tài khoản khác
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            fontSize: 12,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Icon name="shield-check" style={{ width: 14, height: 14, color: '#10b981' }} />
          <span>SkillBridge Enterprise · 256-bit SSL Protected</span>
        </div>
      </div>
    </div>
  );
}
