import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { resolveAvatarUrl } from '../utils/avatarHelper';
import {
  getAdminUserDetail,
  toggleLockUser,
  adjustUserReliability,
  verifyUserKyc,
} from '../api/adminApi';
import { useToast } from '../context/ToastContext';

// Avatar doanh nghiệp với fallback logo chữ cái đầu
function EmployerAvatar({ name, avatarUrl, size = 88, fontSize = 32 }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'E';

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        onError={() => {
          console.warn('[Avatar] Không thể tải logo:', resolvedUrl);
          setImgError(true);
        }}
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          objectFit: 'cover',
          border: '3px solid #0051c3',
          boxShadow: '0 2px 8px rgba(0, 81, 195, 0.15)',
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
        borderRadius: 12,
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        color: '#1d4ed8',
        border: '3px solid #bfdbfe',
        boxShadow: '0 2px 8px rgba(0, 81, 195, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  );
}

export default function AdminEmployerDetail({ userId, initialUser, onBack }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'jobs' | 'kyc' | 'history'
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);

  // Modals
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [relScoreDelta, setRelScoreDelta] = useState(5);
  const [relReason, setRelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserDetail();
    }
  }, [userId]);

  const loadUserDetail = async () => {
    try {
      if (!user) setLoading(true);
      const data = await getAdminUserDetail(userId);
      setUser((prev) => ({
        ...prev,
        ...data,
        avatarUrl: data?.avatarUrl || prev?.avatarUrl || initialUser?.avatarUrl,
      }));
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết nhà tuyển dụng.', 'ban');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async () => {
    setIsSubmitting(true);
    try {
      await toggleLockUser(userId, lockReason);
      showToast(isLocked ? 'Đã mở khóa tài khoản NTD thành công.' : 'Đã khóa tài khoản NTD thành công.', 'check');
      setLockModalOpen(false);
      setLockReason('');
      await loadUserDetail();
    } catch (err) {
      showToast(err.message || 'Lỗi cập nhật trạng thái khóa.', 'ban');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustReliability = async () => {
    if (!relReason.trim() || relReason.trim().length < 10) {
      showToast('Căn cứ điều chỉnh uy tín bắt buộc tối thiểu 10 ký tự (theo BR-ADM-07).', 'ban');
      return;
    }
    const delta = Math.abs(Number(relScoreDelta));
    if (delta > 20) {
      showToast('Quy tắc kiểm duyệt: Điểm điều chỉnh không vượt quá ±20 điểm/lần.', 'ban');
      return;
    }

    setIsSubmitting(true);
    try {
      const targetScore = Math.max(0, Math.min(100, reliabilityScore + Number(relScoreDelta)));
      await adjustUserReliability(userId, targetScore, relReason.trim());
      showToast('Đã cập nhật điểm uy tín nhà tuyển dụng thành công!', 'check');
      setRelModalOpen(false);
      setRelReason('');
      await loadUserDetail();
    } catch (err) {
      showToast(err.message || 'Lỗi cập nhật điểm uy tín.', 'ban');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyKyc = async (approved, reason = '') => {
    try {
      await verifyUserKyc(userId, approved, reason);
      showToast(approved ? 'Đã phê duyệt eKYC doanh nghiệp thành công!' : 'Đã từ chối eKYC doanh nghiệp.', 'check');
      await loadUserDetail();
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý eKYC.', 'ban');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Đang tải hồ sơ nhà tuyển dụng...</div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Đang kết nối hệ thống dữ liệu SkillBridge Admin</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
        <p style={{ color: '#dc2626', marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
          Không tìm thấy hồ sơ nhà tuyển dụng #{userId}.
        </p>
        <button onClick={onBack} className="cf-btn-secondary" style={{ padding: '8px 18px', fontWeight: 600 }}>
          ← Quay lại danh sách người dùng
        </button>
      </div>
    );
  }

  const displayName = user.name || user.fullName || 'Nhà tuyển dụng';
  const displayEmail = user.email || 'Chưa cập nhật email';
  const displayPhone = user.unmaskedPhone || user.phone || 'Chưa cập nhật SĐT';
  const displayIndustry = user.industry || 'Chưa cập nhật lĩnh vực';
  const displayCompanySize = user.companySize || 'Chưa xác định quy mô';
  const displayWebsite = user.website || '';
  const displayAvatar = user.avatarUrl;
  const isLocked = user.status === 'locked';
  const isKycVerified = user.kyc === 'verified' || user.kycStatus === 'verified';
  const isBlacklisted = user.status === 'blacklisted';
  const reliabilityScore = user.reliability ?? user.reliabilityScore ?? 100;
  const walletBalance = Number(user.walletBalance || 0);
  const activeJobs = Number(user.activeJobsCount || 0);
  const completedJobs = Number(user.jobsDone || user.jobsDoneCount || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <button
          onClick={onBack}
          className="cf-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, padding: '8px 16px', fontSize: 13 }}
        >
          <span>←</span> Quay lại danh sách người dùng
        </button>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => {
              setRelScoreDelta(5);
              setRelReason('');
              setRelModalOpen(true);
            }}
            className="cf-btn-secondary"
            style={{
              color: '#0051c3',
              borderColor: '#bfdbfe',
              background: '#eff6ff',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⚡ Điều chỉnh uy tín ({reliabilityScore}đ)
          </button>

          <button
            onClick={() => {
              setLockReason('');
              setLockModalOpen(true);
            }}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              border: 'none',
              background: isLocked ? '#16a34a' : '#dc2626',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            {isLocked ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản'}
          </button>
        </div>
      </div>

      {/* 2. Banner Doanh nghiệp */}
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <EmployerAvatar name={displayName} avatarUrl={displayAvatar} size={88} fontSize={32} />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 23, fontWeight: 700, margin: 0, color: '#111827', letterSpacing: '-0.3px' }}>
              {displayName}
            </h1>

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
              }}
            >
              🏢 Nhà tuyển dụng
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: isLocked ? '#fee2e2' : '#dcfce7',
                color: isLocked ? '#b91c1c' : '#15803d',
                border: isLocked ? '1px solid #fecaca' : '1px solid #bbf7d0',
              }}
            >
              {isLocked ? 'Đã khóa tài khoản' : 'Đang hoạt động'}
            </span>

            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: isKycVerified ? '#dbeafe' : '#fef3c7',
                color: isKycVerified ? '#1d4ed8' : '#b45309',
                border: isKycVerified ? '1px solid #bfdbfe' : '1px solid #fde68a',
              }}
            >
              {isKycVerified ? 'Đã xác thực eKYC ✓' : 'Chưa duyệt eKYC'}
            </span>

            {isBlacklisted && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                }}
              >
                Blacklisted
              </span>
            )}
          </div>

          <div style={{ color: '#4b5563', fontSize: 14, marginTop: 8, fontWeight: 500, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>🏢 Quy mô: <strong>{displayCompanySize}</strong></span>
            <span>🏷️ Lĩnh vực: <strong>{displayIndustry}</strong></span>
            {displayWebsite && (
              <span>
                🌐 Website:{' '}
                <a
                  href={displayWebsite.startsWith('http') ? displayWebsite : `https://${displayWebsite}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0051c3', textDecoration: 'underline', fontWeight: 600 }}
                >
                  {displayWebsite}
                </a>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 22, marginTop: 12, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
            <span>📧 {displayEmail}</span>
            <span>📞 {displayPhone}</span>
            <span>
              ⭐ Điểm uy tín: <strong style={{ color: '#0051c3' }}>{reliabilityScore}/100</strong>
            </span>
            <span>
              📅 Tham gia: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('vi-VN') : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Bố cục 2 Cột: Cột Trái Thông tin Cơ sở, Cột Phải Tabs Chuyên sâu */}
      <div className="admin-detail-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

        {/* CỘT TRÁI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Thông tin tài khoản */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, color: '#111827' }}>
              Thông tin doanh nghiệp
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Mã NTD:</span> <strong style={{ color: '#0051c3' }}>#{user.id}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Vai trò:</span>{' '}
                <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                  Nhà tuyển dụng
                </span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Tên pháp nhân:</span> <strong>{displayName}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Email liên hệ:</span> <strong>{displayEmail}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Số điện thoại:</span> <strong>{displayPhone}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Lĩnh vực chính:</span> <strong>{displayIndustry}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Quy mô nhân sự:</span> <strong>{displayCompanySize}</strong>
              </div>
              {displayWebsite && (
                <div>
                  <span style={{ color: '#6b7280' }}>Website:</span>{' '}
                  <a
                    href={displayWebsite.startsWith('http') ? displayWebsite : `https://${displayWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0051c3', fontWeight: 600 }}
                  >
                    {displayWebsite}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Tài chính & Ví SkillBridge */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, color: '#111827' }}>
              Tài chính & Ví ký quỹ Escrow
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Số dư khả dụng ví:</span>{' '}
                <strong style={{ color: '#16a34a', fontSize: 16 }}>{walletBalance.toLocaleString('vi-VN')} ₫</strong>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>
                Ví dùng để thanh toán cọc ký quỹ Escrow cho các hợp đồng tuyển dụng và dịch vụ trả phí của SkillBridge.
              </div>
            </div>
          </div>

          {/* Chỉ số KPI Tuyển dụng */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, color: '#111827' }}>
              Chỉ số KPI tuyển dụng
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>Tin đang tuyển</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0051c3', marginTop: 4 }}>
                  {activeJobs}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>Hợp đồng xong</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                  {completedJobs}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#6b7280' }}>Uy tín nhà tuyển dụng:</span>
                <strong style={{ color: reliabilityScore >= 80 ? '#16a34a' : reliabilityScore >= 50 ? '#d97706' : '#dc2626' }}>
                  {reliabilityScore}/100
                </strong>
              </div>
              <div style={{ width: '100%', height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${reliabilityScore}%`,
                    height: '100%',
                    background: reliabilityScore >= 80 ? '#16a34a' : reliabilityScore >= 50 ? '#d97706' : '#dc2626',
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Tabs Dữ liệu Chuyên sâu */}
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Header Tab Buttons */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
            {[
              { id: 'profile', label: '🏢 Hồ sơ doanh nghiệp' },
              { id: 'jobs', label: '💼 Chiến dịch tuyển dụng' },
              { id: 'kyc', label: '🪪 Xác thực doanh nghiệp (eKYC)' },
              { id: 'history', label: '🛡️ Nhật ký kiểm toán' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '13px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #0051c3' : '2px solid transparent',
                  background: activeTab === tab.id ? '#fff' : 'transparent',
                  color: activeTab === tab.id ? '#0051c3' : '#6b7280',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 22 }}>
            {/* TAB 1: HỒ SƠ DOANH NGHIỆP */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {user.companyDescription ? (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#475569', fontWeight: 600 }}>
                      Giới thiệu công ty / Doanh nghiệp
                    </h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#1e293b', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {user.companyDescription}
                    </p>
                  </div>
                ) : (
                  <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, border: '1px dashed #cbd5e1', color: '#64748b', fontSize: 13 }}>
                    Doanh nghiệp chưa cập nhật phần giới thiệu mô tả công ty.
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    Lĩnh vực hoạt động & Tuyển dụng
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#fafafa', padding: 14, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Ngành nghề / Lĩnh vực</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{displayIndustry}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Quy mô nhân sự công ty</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{displayCompanySize}</div>
                    </div>
                  </div>
                </div>

                {isBlacklisted && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>Lý do đưa vào Blacklist:</div>
                    <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4 }}>{user.blacklistReason || 'Không có ghi chú cụ thể.'}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CHIẾN DỊCH TUYỂN DỤNG */}
            {activeTab === 'jobs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Tin tuyển dụng đang mở (In Progress)</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#0051c3', marginTop: 4 }}>{activeJobs}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Các vị trí đang tiếp nhận hồ sơ ứng tuyển của sinh viên</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Hợp đồng đã hoàn thành</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{completedJobs}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Dự án đã nghiệm thu và giải ngân Escrow thành công</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '16px 0', borderTop: '1px solid #f3f4f6' }}>
                  Dữ liệu tuyển dụng và hợp đồng được đồng bộ tự động từ hệ thống hợp đồng ký quỹ Escrow SkillBridge.
                </div>
              </div>
            )}

            {/* TAB 3: XÁC THỰC DOANH NGHIỆP (EKYC) */}
            {activeTab === 'kyc' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                        Trạng thái kiểm duyệt pháp nhân:
                        <span
                          style={{
                            marginLeft: 8,
                            padding: '2px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            background: isKycVerified ? '#dcfce7' : '#fef3c7',
                            color: isKycVerified ? '#15803d' : '#b45309',
                          }}
                        >
                          {isKycVerified ? 'Đã phê duyệt' : 'Chờ xác thực'}
                        </span>
                      </div>
                      {user.kycReviewedAt && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                          Duyệt lúc: {new Date(user.kycReviewedAt).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => handleVerifyKyc(false, 'Hồ sơ pháp lý không hợp lệ hoặc thông tin doanh nghiệp không trùng khớp')}
                        className="cf-btn-secondary"
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        Từ chối eKYC
                      </button>
                      <button
                        onClick={() => handleVerifyKyc(true)}
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 18px',
                          borderRadius: 6,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Phê duyệt xác thực pháp nhân ✓
                      </button>
                    </div>
                  </div>

                  {user.kycRejectionReason && (
                    <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', borderRadius: 6, color: '#991b1b', fontSize: 12.5 }}>
                      <strong>Lý do từ chối trước đó:</strong> {user.kycRejectionReason}
                    </div>
                  )}
                </div>

                <div style={{ border: '1px dashed #cbd5e1', padding: 32, borderRadius: 8, textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🏢</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Hồ sơ đối soát doanh nghiệp</div>
                  <p style={{ fontSize: 12.5, margin: '6px 0 0', color: '#64748b' }}>
                    Doanh nghiệp: <strong>{displayName}</strong> | Lĩnh vực: <strong>{displayIndustry}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: NHẬT KÝ KIỂM TOÁN (AUDIT LOGS) */}
            {activeTab === 'history' && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  Nhật ký thao tác quản trị trên tài khoản #{user.id}
                </h4>
                {user.history && user.history.length > 0 ? (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', width: '25%' }}>Thời gian</th>
                          <th style={{ padding: '10px 14px', width: '30%' }}>Hành động</th>
                          <th style={{ padding: '10px 14px' }}>Chi tiết / Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.history.map((h, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{h.time}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0051c3' }}>{h.action}</td>
                            <td style={{ padding: '10px 14px', color: '#374151' }}>{h.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 8, color: '#9ca3af' }}>
                    Chưa có nhật ký can thiệp quản trị nào trên tài khoản này.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Khóa / Mở khóa tài khoản */}
      {lockModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, width: 440, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
              {isLocked ? 'Xác nhận mở khóa tài khoản NTD' : 'Khóa tài khoản nhà tuyển dụng'}
            </h3>
            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
              {isLocked
                ? 'Nhà tuyển dụng sẽ có thể đăng nhập và tiếp tục đăng tin, tạo hợp đồng trên SkillBridge.'
                : 'Vui lòng nhập lý do khóa tài khoản để lưu vết kiểm toán:'}
            </p>
            {!isLocked && (
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Ví dụ: Vi phạm quy tắc thanh toán hợp đồng, đăng tin sai lệch..."
                style={{ width: '100%', height: 80, padding: 8, borderRadius: 4, border: '1px solid #d1d5db', marginBottom: 16, fontSize: 13 }}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setLockModalOpen(false)} className="cf-btn-secondary" disabled={isSubmitting}>
                Hủy
              </button>
              <button
                onClick={handleToggleLock}
                disabled={isSubmitting}
                style={{
                  background: isLocked ? '#16a34a' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isSubmitting ? 'Đang xử lý...' : isLocked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Điều chỉnh Điểm Uy tín */}
      {relModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, width: 440, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Điều chỉnh điểm uy tín NTD</h3>
            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
              Điểm hiện tại: <strong>{reliabilityScore}/100</strong>
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Số điểm thay đổi (+ hoặc - tối đa ±20 theo BR-ADM-07):
              </label>
              <input
                type="number"
                value={relScoreDelta}
                onChange={(e) => setRelScoreDelta(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 4, border: '1px solid #d1d5db' }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Căn cứ điều chỉnh (Bắt buộc tối thiểu 10 ký tự):
              </label>
              <textarea
                value={relReason}
                onChange={(e) => setRelReason(e.target.value)}
                placeholder="Nhập căn cứ xử lý vi phạm hợp đồng hoặc uy tín thanh toán..."
                style={{ width: '100%', height: 70, padding: 8, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setRelModalOpen(false)} className="cf-btn-secondary" disabled={isSubmitting}>
                Hủy
              </button>
              <button
                onClick={handleAdjustReliability}
                disabled={isSubmitting}
                style={{ background: '#0051c3', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
