import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminLogin, adminLogout } from '../../api/authApi';
import { setAccessToken } from '../../api/tokenStore';
import { useToast } from '../../context/ToastContext';
import Icon from '../Icon';

// Hạn mức Idle Lock theo Q-002: 15 phút không tương tác
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export default function IdleLockOverlay() {
  const { showToast } = useToast();
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem('admin_idle_locked') === 'true';
  });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const timerRef = useRef(null);

  // Lấy thông tin admin hiện tại từ localStorage
  const getAdminUser = useCallback(() => {
    try {
      const raw = localStorage.getItem('admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const adminUser = getAdminUser();

  const lockSession = useCallback(() => {
    setIsLocked(true);
    sessionStorage.setItem('admin_idle_locked', 'true');
    setPassword('');
    setError('');
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (isLocked) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      lockSession();
    }, IDLE_TIMEOUT_MS);
  }, [isLocked, lockSession]);

  useEffect(() => {
    if (isLocked) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

    const handleUserActivity = () => {
      resetIdleTimer();
    };

    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [isLocked, resetIdleTimer]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Vui lòng nhập mật khẩu quản trị');
      return;
    }

    const email = adminUser?.email;
    if (!email) {
      adminLogout();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await adminLogin(email, password);
      const token = data.accessToken || data.token;
      if (token) {
        setAccessToken(token);
      }

      setIsLocked(false);
      sessionStorage.removeItem('admin_idle_locked');
      setPassword('');
      showToast('Đã mở khóa phiên làm việc Quản trị!', 'check');
      resetIdleTimer();
    } catch (err) {
      setError(err.message || 'Mật khẩu không chính xác, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_idle_locked');
    adminLogout();
  };

  if (!isLocked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#fff',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 24,
          padding: '36px 32px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
            border: '2px solid rgba(249, 115, 22, 0.4)',
            color: '#fb923c',
            marginBottom: 18,
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.25)'
          }}
        >
          <Icon name="lock" width="30" height="30" />
        </div>

        <div style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', borderRadius: 20, fontSize: 11.5, fontWeight: 700, marginBottom: 12 }}>
          🔒 IDLE LOCK · 15 PHÚT KHÔNG THAO TÁC
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
          Màn hình quản trị đã khóa
        </h2>
        <p style={{ margin: '0 0 20px 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.45 }}>
          Để bảo vệ dữ liệu nhạy cảm, phiên làm việc của <strong>{adminUser?.fullName || 'Quản trị viên'}</strong> ({adminUser?.email || 'admin@skillbridge.vn'}) đã được khóa tự động.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 13,
              color: '#fda4af',
              textAlign: 'left'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu để mở khóa..."
              required
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 42px 12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.18)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#f97316';
                e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 14
              }}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: loading
                ? '#c2410c'
                : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(234, 88, 12, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Đang mở khóa...' : 'Mở khóa phiên làm việc'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 12.5,
              cursor: 'pointer',
              marginTop: 4,
              textDecoration: 'underline'
            }}
          >
            Đăng xuất khỏi hệ thống
          </button>
        </form>
      </div>
    </div>
  );
}
