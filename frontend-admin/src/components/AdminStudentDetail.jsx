import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { resolveAvatarUrl } from '../utils/avatarHelper';
import {
  getAdminUserDetail,
  toggleLockUser,
  adjustUserReliability,
  downloadAdminUserCv,
  getStudentVerificationByUser,
  reviewStudentVerification,
} from '../api/adminApi';
import { useToast } from '../context/ToastContext';

// Component Avatar chuẩn Cloudflare với Fallback chữ cái đầu nếu không có ảnh
function StudentAvatar({ name, avatarUrl, size = 84, fontSize = 28 }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || 'S';

  // Tự động reset trạng thái lỗi mỗi khi avatarUrl thay đổi
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        onError={(e) => {
          console.warn('[Avatar] Không thể tải ảnh:', resolvedUrl);
          setImgError(true);
        }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
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
        borderRadius: '50%',
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

export default function AdminStudentDetail({ userId, initialUser, onBack }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'kyc' | 'history' | 'jobs'
  const [user, setUser] = useState(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);

  // Modals
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [relScoreDelta, setRelScoreDelta] = useState(5);
  const [relReason, setRelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cvBusyId, setCvBusyId] = useState(null);

  // Hồ sơ xác minh thẻ sinh viên thật (từ StudentVerificationRequest), KHÔNG suy luận từ cờ user.kyc
  const [verification, setVerification] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState('');

  // CV nằm ở thư mục riêng tư trên R2, phải tải qua API quản trị có kèm token rồi mở bằng Blob URL
  const handleCvFile = async (cv, action) => {
    // Mở tab trước khi await để trình duyệt không chặn popup
    const viewTab = action === 'view' ? window.open('', '_blank') : null;
    setCvBusyId(cv.id);
    try {
      const blob = await downloadAdminUserCv(userId, cv.id);
      const blobUrl = URL.createObjectURL(blob);
      if (viewTab) {
        viewTab.location.href = blobUrl;
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = cv.fileName || `CV_${user?.name || userId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      if (viewTab) viewTab.close();
      showToast(err.message || 'Không thể mở file CV.', 'ban');
    } finally {
      setCvBusyId(null);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUserDetail();
      loadVerification();
    }
  }, [userId]);

  const loadVerification = async () => {
    setVerificationLoading(true);
    setVerificationError('');
    try {
      const data = await getStudentVerificationByUser(userId);
      setVerification(data || null);
    } catch (err) {
      setVerification(null);
      setVerificationError(err.message || 'Không thể tải hồ sơ xác minh thẻ sinh viên.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const loadUserDetail = async () => {
    try {
      if (!user) setLoading(true);
      const data = await getAdminUserDetail(userId);
      // Giữ lại avatarUrl từ initialUser nếu API chi tiết trả về null/trống
      setUser((prev) => ({
        ...prev,
        ...data,
        avatarUrl: data?.avatarUrl || prev?.avatarUrl || initialUser?.avatarUrl,
      }));
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết người dùng.', 'ban');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = user?.status === 'locked' || user?.isLocked;
  const isBlacklisted = user?.status === 'blacklisted' || user?.isBlacklisted;
  // Trạng thái thẻ SV lấy từ hồ sơ StudentVerificationRequest thật, không suy luận từ cờ user.kyc
  const verificationStatus = verification?.status || null;
  const isKycVerified = verificationStatus === 'approved';
  const isKycRejected = verificationStatus === 'rejected';
  const hasSubmittedVerification = Boolean(verification);
  const reliabilityScore = user?.reliability ?? user?.reliabilityScore ?? 100;
  const displayName = user?.name || user?.fullName || initialUser?.name || initialUser?.fullName || 'Người dùng';
  const displayAvatar = user?.avatarUrl || user?.avatar || initialUser?.avatarUrl || initialUser?.avatar || null;
  const displaySchool = user?.school || user?.schoolName || initialUser?.school || 'Chưa cập nhật trường học';
  const displayIndustry = user?.industry || user?.major || initialUser?.industry || 'Chưa phân loại chuyên ngành';
  const displayPhone = user?.unmaskedPhone || user?.phone || initialUser?.phone || 'Chưa cập nhật SĐT';
  const displayEmail = user?.email || initialUser?.email || 'N/A';
  const walletBalance = user?.walletBalance ?? 0;
  const activeJobs = user?.activeJobsCount ?? 0;
  const completedJobs = user?.jobsDone ?? 0;

  const handleToggleLock = async () => {
    setIsSubmitting(true);
    try {
      await toggleLockUser(userId, lockReason);
      showToast(isLocked ? 'Đã mở khóa tài khoản thành công.' : 'Đã khóa tài khoản thành công.', 'check');
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
      showToast('Đã cập nhật điểm uy tín thành công!', 'check');
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
    if (!verification?.id) {
      showToast('Sinh viên chưa gửi yêu cầu xác minh thẻ nào để duyệt.', 'ban');
      return;
    }
    try {
      await reviewStudentVerification(verification.id, {
        decision: approved ? 'approve' : 'reject',
        rejectionReason: approved ? undefined : reason,
      });
      showToast(approved ? 'Đã phê duyệt xác thực thẻ SV thành công!' : 'Đã từ chối hồ sơ xác thực thẻ SV.', 'check');
      await loadVerification();
    } catch (err) {
      showToast(err.message || 'Lỗi xử lý xác thực thẻ sinh viên.', 'ban');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Đang tải hồ sơ sinh viên...</div>
        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Đang kết nối hệ thống dữ liệu SkillBridge Admin</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
        <p style={{ color: '#dc2626', marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
          Không tìm thấy hồ sơ người dùng #{userId}.
        </p>
        <button onClick={onBack} className="cf-btn-secondary" style={{ padding: '8px 18px', fontWeight: 600 }}>
          ← Quay lại danh sách người dùng
        </button>
      </div>
    );
  }

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
              gap: 6
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
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {isLocked ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản'}
          </button>
        </div>
      </div>

      {/* 2. Banner Thông tin Tổng quan - Thiết kế hiện đại */}
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
        <StudentAvatar name={displayName} avatarUrl={displayAvatar} size={88} fontSize={32} />

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

          <div style={{ color: '#4b5563', fontSize: 14, marginTop: 6, fontWeight: 500 }}>
            🎓 <strong>{displaySchool}</strong> • Chuyên ngành / Lĩnh vực: <strong>{displayIndustry}</strong>
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
              Thông tin tài khoản
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Mã người dùng:</span> <strong style={{ color: '#0051c3' }}>#{user.id}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Vai trò:</span>{' '}
                <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                  {user.role === 'student' ? 'Sinh viên' : user.role === 'employer' ? 'Nhà tuyển dụng' : user.role}
                </span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Email xác thực:</span> <strong>{displayEmail}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Số điện thoại:</span> <strong>{displayPhone}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Trường học:</span> <strong>{displaySchool}</strong>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Ngành đào tạo:</span> <strong>{displayIndustry}</strong>
              </div>
            </div>
          </div>

          {/* Tài chính & Ví SkillBridge */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, color: '#111827' }}>
              Tài chính & Ví SkillBridge
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <span style={{ color: '#6b7280' }}>Số dư khả dụng:</span>{' '}
                <strong style={{ color: '#16a34a', fontSize: 16 }}>{walletBalance.toLocaleString('vi-VN')} ₫</strong>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.4 }}>
                Số dư ví được quản lý bởi hợp đồng ký quỹ Escrow và lệnh rút tiền bảo chứng.
              </div>
            </div>
          </div>

          {/* Chỉ số KPI */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, color: '#111827' }}>
              Chỉ số KPI & Hoạt động
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>Đang thực hiện</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0051c3', marginTop: 4 }}>
                  {activeJobs}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 11.5, color: '#6b7280', fontWeight: 500 }}>Đã hoàn thành</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                  {completedJobs}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#6b7280' }}>Độ tin cậy tài khoản:</span>
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
              { id: 'profile', label: '📄 Hồ sơ & Chuyên môn' },
              { id: 'kyc', label: '🪪 Thẻ sinh viên (eKYC)' },
              { id: 'history', label: '🛡️ Nhật ký kiểm toán' },
              { id: 'jobs', label: '💼 Thống kê dự án' },
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
            {/* TAB 1: HỒ SƠ & CHUYÊN MÔN */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {user.companyDescription && (
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: '#475569', fontWeight: 600 }}>Giới thiệu bản thân</h4>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#1e293b', lineHeight: 1.6 }}>{user.companyDescription}</p>
                  </div>
                )}

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Thông tin học thuật</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#fafafa', padding: 14, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Cơ sở giáo dục / Đại học</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{displaySchool}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Chuyên ngành đào tạo</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{displayIndustry}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Kỹ năng & Năng lực sinh viên</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(displayIndustry.includes(',')
                      ? displayIndustry.split(',').map((s) => s.trim())
                      : [displayIndustry, 'Kỹ năng chuyên môn', 'Giải quyết vấn đề', 'Làm việc nhóm']
                    ).map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          padding: '5px 12px',
                          borderRadius: 6,
                          fontSize: 12.5,
                          fontWeight: 500,
                          border: '1px solid #dbeafe',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* KHỐI HỒ SƠ CV CỦA SINH VIÊN */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📄</span> Hồ sơ CV đã tải lên ({user.cvs?.length || 0})
                    </h4>
                  </div>

                  {user.cvs && user.cvs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {user.cvs.map((cv) => {
                        const fileSizeKb = cv.fileSize ? (cv.fileSize / 1024).toFixed(1) : '—';
                        const uploadDate = cv.uploadedAt ? new Date(cv.uploadedAt).toLocaleDateString('vi-VN') : '—';

                        return (
                          <div
                            key={cv.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 18px',
                              borderRadius: 8,
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              transition: 'border-color 0.2s ease',
                              gap: 16,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 260, flex: 1 }}>
                              <div
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: 8,
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 20,
                                  flexShrink: 0,
                                }}
                              >
                                📕
                              </div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                                  {cv.label || cv.fileName || `CV Hồ sơ #${cv.id}`}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                                  <span style={{ fontWeight: 500, color: '#0284c7' }}>
                                    {cv.categoryName || 'Chung / Đa ngành'}
                                  </span>{' '}
                                  • {fileSizeKb} KB • Tải lên: {uploadDate}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleCvFile(cv, 'view')}
                                disabled={cvBusyId === cv.id}
                                style={{
                                  padding: '7px 14px',
                                  borderRadius: 6,
                                  background: '#0051c3',
                                  color: '#fff',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  border: 'none',
                                  cursor: cvBusyId === cv.id ? 'wait' : 'pointer',
                                  opacity: cvBusyId === cv.id ? 0.7 : 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  boxShadow: '0 1px 2px rgba(0, 81, 195, 0.2)',
                                }}
                                title="Mở file CV trực tiếp trong tab mới"
                              >
                                👁️ Xem CV
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCvFile(cv, 'download')}
                                disabled={cvBusyId === cv.id}
                                style={{
                                  cursor: cvBusyId === cv.id ? 'wait' : 'pointer',
                                  padding: '7px 14px',
                                  borderRadius: 6,
                                  background: '#fff',
                                  color: '#334155',
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  border: '1px solid #cbd5e1',
                                }}
                                title="Tải file CV về máy"
                              >
                                📥 Tải về
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '24px 16px',
                        borderRadius: 8,
                        background: '#fafafa',
                        border: '1px dashed #d1d5db',
                        textAlign: 'center',
                        color: '#6b7280',
                      }}
                    >
                      <div style={{ fontSize: 26, marginBottom: 6 }}>📂</div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: '#374151' }}>
                        Sinh viên chưa tải lên hồ sơ CV nào
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        Khi sinh viên upload file CV ứng tuyển, hồ sơ sẽ được hiển thị tại đây để quản trị viên kiểm duyệt.
                      </div>
                    </div>
                  )}
                </div>

                {isBlacklisted && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>Lý do đưa vào Blacklist:</div>
                    <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4 }}>{user.blacklistReason || 'Không có ghi chú cụ thể.'}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: THẺ SINH VIÊN (EKYC) */}
            {activeTab === 'kyc' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {verificationLoading ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    Đang tải hồ sơ xác minh thẻ sinh viên...
                  </div>
                ) : verificationError ? (
                  <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 13 }}>
                    {verificationError}
                  </div>
                ) : !hasSubmittedVerification ? (
                  <div style={{ border: '1px dashed #cbd5e1', padding: 32, borderRadius: 8, textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🪪</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Chưa gửi yêu cầu xác minh thẻ sinh viên</div>
                    <p style={{ fontSize: 12.5, margin: '6px 0 0', color: '#64748b' }}>
                      Sinh viên <strong>{displayName}</strong> chưa upload ảnh thẻ hoặc chưa nộp yêu cầu xác minh nào lên hệ thống. Không có gì để quản trị viên duyệt.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                            Trạng thái kiểm duyệt thẻ SV:
                            <span
                              style={{
                                marginLeft: 8,
                                padding: '2px 10px',
                                borderRadius: 12,
                                fontSize: 12,
                                background: isKycVerified ? '#dcfce7' : isKycRejected ? '#fee2e2' : '#fef3c7',
                                color: isKycVerified ? '#15803d' : isKycRejected ? '#b91c1c' : '#b45309',
                              }}
                            >
                              {isKycVerified ? 'Đã phê duyệt' : isKycRejected ? 'Đã từ chối' : 'Chờ xác thực'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                            Mã SV: <strong>{verification.studentCode || '—'}</strong> · Trường: <strong>{verification.schoolName || displaySchool}</strong>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                            Gửi lúc: {verification.submittedAt ? new Date(verification.submittedAt).toLocaleString('vi-VN') : '—'}
                            {verification.reviewedAt && ` · Duyệt lúc: ${new Date(verification.reviewedAt).toLocaleString('vi-VN')}`}
                          </div>
                        </div>

                        {verificationStatus === 'pending' && (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              onClick={() => handleVerifyKyc(false, 'Ảnh thẻ không hợp lệ hoặc thông tin không trùng khớp')}
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
                              Phê duyệt xác thực thẻ SV ✓
                            </button>
                          </div>
                        )}
                      </div>

                      {verification.rejectionReason && (
                        <div style={{ marginTop: 12, padding: 10, background: '#fee2e2', borderRadius: 6, color: '#991b1b', fontSize: 12.5 }}>
                          <strong>Lý do từ chối:</strong> {verification.rejectionReason}
                        </div>
                      )}
                    </div>

                    {(verification.frontCardUrl || verification.backCardUrl) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                        {verification.frontCardUrl && (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#f8fafc' }}>Mặt trước thẻ SV</div>
                            <img src={verification.frontCardUrl} alt="Mặt trước thẻ sinh viên" style={{ width: '100%', display: 'block' }} />
                          </div>
                        )}
                        {verification.backCardUrl && (
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, color: '#374151', background: '#f8fafc' }}>Mặt sau thẻ SV</div>
                            <img src={verification.backCardUrl} alt="Mặt sau thẻ sinh viên" style={{ width: '100%', display: 'block' }} />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {isBlacklisted && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c' }}>Lý do đưa vào Blacklist:</div>
                    <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4 }}>{user.blacklistReason || 'Không có ghi chú cụ thể.'}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: NHẬT KÝ KIỂM TOÁN (AUDIT LOGS) */}
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

            {/* TAB 4: THỐNG KÊ DỰ ÁN */}
            {activeTab === 'jobs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Dự án đang làm (In Progress)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#0051c3', marginTop: 4 }}>{activeJobs}</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Dự án đã nghiệm thu thành công</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>{completedJobs}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
                  Thông tin tiến độ dự án được đồng bộ trực tiếp từ hợp đồng ký quỹ Escrow của SkillBridge.
                </div>
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
              {isLocked ? 'Xác nhận mở khóa tài khoản' : 'Khóa tài khoản sinh viên'}
            </h3>
            <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 12 }}>
              {isLocked
                ? 'Sinh viên sẽ có thể đăng nhập và tiếp tục hoạt động trên SkillBridge.'
                : 'Vui lòng nhập lý do khóa tài khoản để lưu vết kiểm toán:'}
            </p>
            {!isLocked && (
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Ví dụ: Vi phạm quy tắc ứng tuyển, spam tin nhắn..."
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
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Điều chỉnh điểm uy tín (Reliability Score)</h3>
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
                placeholder="Nhập căn cứ xử lý vi phạm hoặc khen thưởng..."
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
