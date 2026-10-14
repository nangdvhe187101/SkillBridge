import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from './Icon';
import Pagination from './Pagination';
import { getLoginHistory, getLoginStats } from '../api/adminApi';
import { resolveAvatarUrl } from '../utils/avatarHelper';
import { useToast } from '../context/ToastContext';

// Helper phân tích User-Agent thành Trình duyệt & Hệ điều hành thân thiện
function parseUserAgent(ua) {
  if (!ua || ua === 'Unknown') return { browser: 'Không xác định', os: 'Không xác định', icon: 'globe' };

  let os = 'Thiết bị khác';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Trình duyệt web';
  let icon = 'globe';
  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
    icon = 'globe';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Google Chrome';
    icon = 'globe';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
    icon = 'globe';
  } else if (/safari/i.test(ua)) {
    browser = 'Apple Safari';
    icon = 'globe';
  }

  return { browser, os, icon };
}

// Helper định dạng thời gian tương đối
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function UserAvatar({ name, avatarUrl, size = 32 }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'U';

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#eff6ff',
        color: '#1d4ed8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        flexShrink: 0,
        border: '1px solid #dbeafe',
      }}
    >
      {initial}
    </div>
  );
}

export default function AdminLoginAudit() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    activeUsers24h: 0,
    studentsToday: 0,
    employersToday: 0,
    adminsToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [activeRole, setActiveRole] = useState('all'); // 'all' | 'student' | 'employer' | 'admin'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, statsRes] = await Promise.allSettled([
        getLoginHistory({
          page,
          pageSize,
          role: activeRole,
          query: debouncedQuery,
        }),
        getLoginStats(),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value) {
        setLogs(historyRes.value.items || []);
        setTotal(historyRes.value.total || 0);
      }

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải lịch sử đăng nhập.', 'ban');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeRole, debouncedQuery, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tự động làm mới mỗi 30 giây để cập nhật tài khoản vừa đăng nhập
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🛡️</span> Giám sát Tài khoản & Đăng nhập Hệ thống
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#dcfce7',
                color: '#15803d',
                border: '1px solid #bbf7d0',
              }}
            >
              ● Giám sát trực tiếp
            </span>
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            Theo dõi thời gian thực các phiên đăng nhập mới của Sinh viên, Nhà tuyển dụng và Quản trị viên trên toàn hệ thống SkillBridge.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="cf-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '7px 14px' }}
          title="Tải lại dữ liệu"
        >
          <span>🔄</span> Làm mới
        </button>
      </div>

      {/* 2. Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Lượt đăng nhập hôm nay
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0051c3', marginTop: 6 }}>
            {stats.totalToday.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Tất cả các tài khoản truy cập
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Tài khoản hoạt động 24h
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a', marginTop: 6 }}>
            {stats.activeUsers24h.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Người dùng duy nhất (Unique users)
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Sinh viên truy cập
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', marginTop: 6 }}>
            {stats.studentsToday.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Tìm việc & nộp CV
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Nhà tuyển dụng truy cập
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#059669', marginTop: 6 }}>
            {stats.employersToday.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Đăng tin & quản lý hợp đồng
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Quản trị viên đăng nhập
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#7c3aed', marginTop: 6 }}>
            {stats.adminsToday.toLocaleString('vi-VN')}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Xác thực qua 2FA TOTP
          </div>
        </div>
      </div>

      {/* 3. Bảng điều khiển bộ lọc & Tìm kiếm */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        {/* Role Tabs */}
        <div style={{ display: 'flex', gap: 6, background: '#f3f4f6', padding: 4, borderRadius: 6 }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'student', label: 'Sinh viên' },
            { id: 'employer', label: 'Nhà tuyển dụng' },
            { id: 'admin', label: 'Quản trị viên' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleRoleChange(tab.id)}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: activeRole === tab.id ? '#fff' : 'transparent',
                color: activeRole === tab.id ? '#111827' : '#6b7280',
                boxShadow: activeRole === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 280 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm theo email, họ tên, địa chỉ IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Danh sách bản ghi Đăng nhập */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Đang tải nhật ký đăng nhập...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Không tìm thấy phiên đăng nhập nào phù hợp.</div>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
              Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc vai trò khác.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  <th style={{ padding: '12px 18px', width: '28%' }}>Tài khoản / Người dùng</th>
                  <th style={{ padding: '12px 16px', width: '16%' }}>Vai trò</th>
                  <th style={{ padding: '12px 16px', width: '16%' }}>Phương thức</th>
                  <th style={{ padding: '12px 16px', width: '18%' }}>Thiết bị & IP</th>
                  <th style={{ padding: '12px 18px', width: '22%' }}>Thời gian đăng nhập</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const uaInfo = parseUserAgent(log.userAgent);
                  const isRoleStudent = log.role === 'student';
                  const isRoleEmployer = log.role === 'employer';
                  const isRoleAdmin = log.role === 'admin' || log.role === 'super_admin' || log.role === 'business_admin' || log.role === 'super';

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Người dùng */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <UserAvatar name={log.fullName} avatarUrl={log.avatarUrl} size={34} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{log.fullName}</span>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{log.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: 14,
                            background: isRoleAdmin ? '#f3e8ff' : isRoleEmployer ? '#dcfce7' : '#eff6ff',
                            color: isRoleAdmin ? '#7e22ce' : isRoleEmployer ? '#15803d' : '#1d4ed8',
                            border: `1px solid ${isRoleAdmin ? '#e9d5ff' : isRoleEmployer ? '#bbf7d0' : '#bfdbfe'}`,
                            display: 'inline-block',
                          }}
                        >
                          {log.roleName}
                        </span>
                      </td>

                      {/* Phương thức */}
                      <td style={{ padding: '12px 16px' }}>
                        {log.method === 'google_sso' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#374151',
                              background: '#f3f4f6',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            <span style={{ color: '#ea4335', fontWeight: 700 }}>G</span> Google SSO
                          </span>
                        ) : log.method === 'admin_totp' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#7c3aed',
                              background: '#f5f3ff',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            🔐 2FA Authenticator
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              fontWeight: 500,
                              color: '#4b5563',
                              background: '#f9fafb',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            🔑 Mật khẩu
                          </span>
                        )}
                      </td>

                      {/* Thiết bị & IP */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: '#374151', fontSize: 12.5 }}>
                            {uaInfo.browser} ({uaInfo.os})
                          </span>
                          <span style={{ fontSize: 11.5, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 }}>
                            IP: {log.ipAddress || 'Unknown'}
                          </span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#0051c3', fontSize: 13 }}>
                            {formatRelativeTime(log.loginAt)}
                          </span>
                          <span style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>
                            {new Date(log.loginAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Phân trang */}
        {total > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>
              Hiển thị <strong>{Math.min((page - 1) * pageSize + 1, total)}</strong> -{' '}
              <strong>{Math.min(page * pageSize, total)}</strong> trên tổng số <strong>{total}</strong> phiên đăng nhập
            </span>

            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onChange={(newPage) => setPage(newPage)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
