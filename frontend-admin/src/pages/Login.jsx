import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api/authApi';
import { setAccessToken } from '../api/tokenStore';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await adminLogin(email.trim(), password);
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
    } catch (err) {
      setError(err.message || 'Thông tin đăng nhập không đúng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 100%)',
      padding: 20,
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#fff',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src="/logo.png"
            alt="SkillBridge Logo"
            style={{ height: 52, borderRadius: 12, background: '#fff', padding: 4, marginBottom: 16 }}
          />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Quản Trị Hệ Thống
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Cổng đăng nhập an toàn dành riêng cho Quản trị viên
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: 13.5,
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#cbd5e1' }}>
              Email Quản trị
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@skillbridge.vn"
              required
              autoFocus
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#cbd5e1' }}>
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: loading ? '#6366f1' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập Quản trị'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
          SkillBridge Enterprise · Internal Access Only
        </div>
      </div>
    </div>
  );
}
