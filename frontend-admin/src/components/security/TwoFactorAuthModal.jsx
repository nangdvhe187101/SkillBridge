import { useState, useEffect } from 'react';
import { getAdmin2FaStatus, setupAdmin2Fa, confirmAdmin2Fa, disableAdmin2Fa } from '../../api/authApi';
import { useToast } from '../../context/ToastContext';
import Icon from '../Icon';

export default function TwoFactorAuthModal({ isOpen, onClose }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ isTwoFactorEnabled: false, enabledAt: null });
  const [step, setStep] = useState('overview'); // 'overview' | 'setup'
  const [setupData, setSetupData] = useState(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    } else {
      setStep('overview');
      setSetupData(null);
      setCode('');
      setCopied(false);
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await getAdmin2FaStatus();
      setStatus(res || { isTwoFactorEnabled: false });
    } catch (err) {
      console.warn('Lỗi khi tải trạng thái 2FA:', err);
    } finally {
      setLoading(false);
    }
  };

  const [errorMessage, setErrorMessage] = useState('');

  const handleStartSetup = async () => {
    setSubmitting(true);
    setErrorMessage('');
    try {
      const data = await setupAdmin2Fa();
      setSetupData(data);
      setStep('setup');
      setCode('');
    } catch (err) {
      showToast(err.message || 'Không thể tạo mã thiết lập 2FA.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanCode = code.replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số từ ứng dụng Authenticator.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmAdmin2Fa(cleanCode, setupData?.secretKey);
      showToast('Đã kích hoạt xác thực 2 bước (Google Authenticator) thành công!', 'check');
      await loadStatus();
      setStep('overview');
      setSetupData(null);
    } catch (err) {
      const msg = err.message || 'Mã xác thực không đúng hoặc đã hết hạn.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn TẮT xác thực 2 bước không? Tài khoản sẽ giảm mức độ bảo vệ.')) {
      return;
    }

    setSubmitting(true);
    try {
      await disableAdmin2Fa();
      showToast('Đã tắt xác thực 2 bước.', 'info');
      await loadStatus();
    } catch (err) {
      showToast(err.message || 'Lỗi khi tắt 2FA.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (!setupData?.manualEntryKey) return;
    navigator.clipboard.writeText(setupData.manualEntryKey.replace(/\s+/g, ''));
    setCopied(true);
    showToast('Đã sao chép khóa bí mật vào bộ nhớ tạm!', 'check');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#ffffff',
          borderRadius: 14,
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Xác Thực 2 Bước (Google Authenticator)
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                Chuẩn bảo mật TOTP RFC 6238 bảo vệ tài khoản Quản trị
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6
            }}
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
              Đang kiểm tra trạng thái bảo mật...
            </div>
          ) : step === 'overview' ? (
            <div>
              {status.isTwoFactorEnabled ? (
                /* Trạng thái đã bật */
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 30,
                      margin: '0 auto 16px',
                      border: '2px solid #a7f3d0'
                    }}
                  >
                    ✓
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 16, color: '#065f46', fontWeight: 700 }}>
                    Tài khoản đã được bảo vệ an toàn
                  </h4>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    Xác thực hai yếu tố (2FA TOTP) đang <b>kích hoạt</b>. Mỗi khi đăng nhập, hệ thống sẽ yêu cầu mã 6 số từ ứng dụng Authenticator trên điện thoại của bạn.
                  </p>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '12px 14px',
                      textAlign: 'left',
                      fontSize: 12.5,
                      color: '#334155',
                      marginBottom: 20
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#64748b' }}>Trạng thái:</span>
                      <b style={{ color: '#059669' }}>Đang hoạt động</b>
                    </div>
                    {status.enabledAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Thời gian bật:</span>
                        <span>{new Date(status.enabledAt).toLocaleString('vi-VN')}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleDisable}
                    disabled={submitting}
                    className="btn btn-outline"
                    style={{
                      color: '#dc2626',
                      borderColor: '#fca5a5',
                      width: '100%',
                      padding: '9px 16px',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    {submitting ? 'Đang xử lý...' : 'Tắt xác thực 2 bước'}
                  </button>
                </div>
              ) : (
                /* Trạng thái chưa bật */
                <div>
                  <div
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 10,
                      padding: '14px 16px',
                      marginBottom: 18,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start'
                    }}
                  >
                    <span style={{ fontSize: 22 }}>💡</span>
                    <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.5 }}>
                      <b>Vì sao nên bật Google Authenticator?</b>
                      <p style={{ margin: '4px 0 0', color: '#1e3a8a' }}>
                        Dù mật khẩu của bạn có bị lộ, kẻ xấu cũng <b>không thể đăng nhập</b> vào hệ thống nếu không có điện thoại của bạn để lấy mã 6 số thay đổi mỗi 30 giây.
                      </p>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, marginBottom: 20 }}>
                    <p style={{ margin: '0 0 10px' }}>Quy trình cài đặt rất nhanh chóng trong 3 bước:</p>
                    <ol style={{ paddingLeft: 20, margin: 0 }}>
                      <li>Cài app <b>Google Authenticator</b> trên điện thoại.</li>
                      <li>Quét mã QR được cấp.</li>
                      <li>Nhập 6 số để kích hoạt.</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleStartSetup}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    {submitting ? 'Đang khởi tạo...' : 'Bắt đầu thiết lập Google Authenticator'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Bước Setup: Quét QR & Nhập mã */
            <div>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Bước 1 & 2: Quét mã QR
                </span>
                <p style={{ margin: '4px 0 12px', fontSize: 13, color: '#475569' }}>
                  Mở ứng dụng <b>Google Authenticator</b> hoặc <b>Microsoft Authenticator</b> trên điện thoại, bấm dấu <b>+</b> và chọn <b>Quét mã QR</b>:
                </p>

                {/* QR Code Frame */}
                {setupData?.qrCodeUri && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      marginBottom: 12
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qrCodeUri)}`}
                      alt="Google Authenticator QR Code"
                      style={{
                        width: 170,
                        height: 170,
                        borderRadius: 6,
                        display: 'inline-block',
                        background: '#fff',
                        padding: 6,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </div>
                )}

                {/* Khóa nhập tay */}
                {setupData?.manualEntryKey && (
                  <div
                    style={{
                      background: '#f1f5f9',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: 11 }}>Hoặc nhập khóa thủ công:</span>
                      <code style={{ fontWeight: 700, color: '#0f172a', letterSpacing: '1px' }}>
                        {setupData.manualEntryKey}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                    >
                      {copied ? 'Đã chép ✓' : 'Sao chép'}
                    </button>
                  </div>
                )}
              </div>

              {/* Bước 3: Nhập mã xác nhận */}
              <form onSubmit={handleConfirmCode} style={{ marginTop: 18 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Bước 3: Nhập mã 6 số từ ứng dụng
                </span>
                <p style={{ margin: '4px 0 10px', fontSize: 13, color: '#475569' }}>
                  Nhập mã 6 chữ số đang hiển thị trong app để xác nhận:
                </p>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                  💡 Mẹo: Hỗ trợ mã từ Google Authenticator hoặc mã thử nghiệm <b>123456</b>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '8px',
                    padding: '10px',
                    borderRadius: 8,
                    border: '2px solid #2563eb',
                    marginBottom: 14,
                    outline: 'none'
                  }}
                  autoFocus
                  required
                />

                {errorMessage && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: 12.5,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => { setStep('overview'); setSetupData(null); }}
                    className="btn btn-outline"
                    style={{ flex: 1, padding: '10px' }}
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || code.length !== 6}
                    className="btn btn-primary"
                    style={{ flex: 2, padding: '10px', fontWeight: 600 }}
                  >
                    {submitting ? 'Đang xác minh...' : 'Kích hoạt 2FA'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
