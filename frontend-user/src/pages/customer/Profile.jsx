import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import ModalShell from '../../components/modals/ModalShell';
import UserTierBadge from '../../components/common/UserTierBadge';
import { useStore } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { downloadCandidateCv } from '../../utils/fileDownloader';
import { uploadAvatar, getMyPortfolio, uploadPortfolioItem, deletePortfolioItem, getMyBadges, getUserProfile, updateUserProfile } from '../../api/userApi';
import { getUserReviews } from '../../api/reviewApi';
import { getKycStatus } from '../../api/kycApi';
import { getMyCvFiles } from '../../api/cvApi';
import { slugify } from '../../data/companies';

function tierFromScore(score) {
  if (score >= 95) return 'gold';
  if (score >= 85) return 'silver';
  return 'bronze';
}
const TIER_LABEL = { gold: 'Hạng Vàng (Gold)', silver: 'Hạng Bạc (Silver)', bronze: 'Hạng Đồng (Bronze)' };

export default function Profile() {
  const { state, dispatch, addEmployerDocs, removeEmployerDoc, updateProfile } = useStore();
  const userPlanCode = state.activePlanCode || (state.vipBusiness ? 'EMP_VIP' : (state.subscriptionPro ? 'STU_PRO' : 'FREE'));
  const { showToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const docInputRef = useRef();
  const portfolioInputRef = useRef();
  const avatarInputRef = useRef();

  const rawAvatarUrl = state.currentUser?.avatarUrl || null;
  const { openModal } = useModal();
  const [kycData, setKycData] = useState(null);
  const [selectedPf, setSelectedPf] = useState(null);

  // Profile và Dữ liệu thật từ Backend API
  const [profileData, setProfileData] = useState(null);
  const [cvList, setCvList] = useState([]);
  const [loadingCvs, setLoadingCvs] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [portfolioList, setPortfolioList] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const [badgeList, setBadgeList] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);

  // Chỉnh sửa trực tiếp phần giới thiệu doanh nghiệp (Về Chúng Tôi)
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [companyBio, setCompanyBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  const effectiveUser = profileData || state.currentUser;
  const currentUserId = effectiveUser?.id;
  const userRole = (effectiveUser?.roleCode || effectiveUser?.roleName || state.role || 'student').toLowerCase();
  const isEmployer = userRole === 'employer' || userRole === 'recruiter' || userRole === 'business';

  const fetchKyc = async () => {
    try {
      const res = await getKycStatus();
      setKycData(res);
    } catch { }
  };

  const loadProfile = async () => {
    try {
      const p = await getUserProfile();
      setProfileData(p);
      if (dispatch) {
        dispatch({ type: 'UPDATE_PROFILE', patch: p });
      }
    } catch (err) {
      console.error('Lỗi lấy thông tin Profile:', err);
    }
  };

  const handleSaveCompanyBio = async () => {
    setSavingBio(true);
    try {
      await updateUserProfile({ companyDescription: companyBio.trim() });
      await loadProfile();
      showToast('Cập nhật thông tin giới thiệu thành công!', 'success');
      setIsEditingBio(false);
    } catch (err) {
      showToast(err.message || 'Không thể lưu giới thiệu doanh nghiệp.', 'error');
    } finally {
      setSavingBio(false);
    }
  };

  const loadCvs = async () => {
    if (isEmployer) return;
    try {
      setLoadingCvs(true);
      const data = await getMyCvFiles();
      setCvList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách CV tại Profile:', err);
    } finally {
      setLoadingCvs(false);
    }
  };

  const loadReviews = async () => {
    if (!currentUserId) return;
    try {
      setLoadingReviews(true);
      const data = await getUserReviews(currentUserId);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách đánh giá:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const loadPortfolio = async () => {
    if (isEmployer) return;
    try {
      setLoadingPortfolio(true);
      const data = await getMyPortfolio();
      setPortfolioList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách Portfolio:', err);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const loadBadges = async () => {
    if (isEmployer) return;
    try {
      setLoadingBadges(true);
      const data = await getMyBadges();
      setBadgeList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách huy hiệu:', err);
    } finally {
      setLoadingBadges(false);
    }
  };

  useEffect(() => {
    loadProfile();
    fetchKyc();
    loadCvs();
  }, [isEmployer]);

  useEffect(() => {
    if (currentUserId) {
      loadReviews();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isEmployer) {
      loadPortfolio();
      loadBadges();
    }
  }, [isEmployer]);

  useEffect(() => {
    localStorage.removeItem('avatarUrl');
  }, []);

  const reliability = effectiveUser?.reliabilityScore ?? state.myReliability ?? 100;
  const tier = tierFromScore(reliability);
  const completedJobs = effectiveUser?.jobsDoneCount ?? (state.myApplications?.filter((a) => a.status === 'completed')?.length || 0);

  const avgStars = reviews.length
    ? (reviews.reduce((s, r) => s + (r.stars || 5), 0) / reviews.length).toFixed(1)
    : null;

  // Trích xuất ngành chuyên môn từ danh sách CV thật
  const activeSkills = useMemo(() => {
    const cats = cvList.map((c) => c.categoryName).filter(Boolean);
    const unique = Array.from(new Set(cats));
    return unique.length > 0 ? unique : ['Ứng viên tiềm năng', 'Sẵn sàng nhận việc'];
  }, [cvList]);

  const onAvatarChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      showToast('Đang tải lên ảnh đại diện…', 'hourglass');
      const res = await uploadAvatar(f);
      if (dispatch) {
        dispatch({ type: 'UPDATE_PROFILE', patch: { avatarUrl: res.avatarUrl } });
      } else if (updateProfile) {
        await updateProfile({ avatarUrl: res.avatarUrl });
      }
      showToast('Đã cập nhật ảnh đại diện mới!', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể tải lên ảnh đại diện.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const onDocsChange = (e) => {
    const files = Array.from(e.target.files).map((f) => ({ name: f.name, size: f.size }));
    if (files.length) {
      addEmployerDocs(files);
      showToast(`Đã thêm ${files.length} tài liệu doanh nghiệp.`, 'check');
    }
    e.target.value = '';
  };

  const onPortfolioChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      showToast('Dung lượng file vượt quá giới hạn (tối đa 15 MB).', 'error');
      e.target.value = '';
      return;
    }
    try {
      showToast('Đang tải lên tác phẩm vào Portfolio…', 'hourglass');
      const newItem = await uploadPortfolioItem(f);
      setPortfolioList((prev) => [newItem, ...prev]);
      showToast(`Đã thêm dự án "${newItem.fileName}" vào Portfolio!`, 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể tải lên tác phẩm.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const onDeletePortfolio = async (id, fileName) => {
    const confirmed = await confirm(`Bạn có chắc chắn muốn xóa "${fileName}" khỏi Portfolio?`, {
      danger: true,
      confirmLabel: 'Xóa tác phẩm',
      cancelLabel: 'Hủy'
    });
    if (!confirmed) return;

    try {
      await deletePortfolioItem(id);
      setPortfolioList((prev) => prev.filter((p) => p.id !== id));
      showToast('Đã xóa tác phẩm khỏi Portfolio.', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể xóa tác phẩm.', 'error');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const currentName = isEmployer
    ? (effectiveUser?.companyName || effectiveUser?.fullName || 'Doanh nghiệp SkillBridge')
    : (effectiveUser?.fullName || state.displayName || 'Sinh viên SkillBridge');

  const publicProfileUrl = isEmployer
    ? `/company/${slugify(currentName)}`
    : `/student/${slugify(currentName)}`;

  return (
    <div className="page active">
      {/* Profile Hero Header */}
      <div className="profile-hero">
        <div className="wrap">
          <div className="ph-row">
            <div
              className="ph-avatar"
              style={{
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '22px',
                width: 88,
                height: 88,
                overflow: 'hidden',
                flexShrink: 0
              }}
              title="Bấm để đổi ảnh đại diện"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Avatar
                src={rawAvatarUrl}
                name={currentName}
                fontSize={32}
                style={{ width: '100%', height: '100%', borderRadius: '22px' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  background: 'var(--primary, #6c4cff)',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                <Icon name="camera" style={{ width: 13, height: 13, color: '#fff' }} />
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarChange} />
            </div>

            <div>
              <div className="ph-name" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{currentName}</span>
                <UserTierBadge
                  planCode={userPlanCode}
                  userRole={isEmployer ? 'employer' : 'student'}
                  variant="pill"
                  size="md"
                  expiresAt={state.subscriptionExpiresAt}
                  onManageClick={() => navigate('/pricing')}
                />
                {!isEmployer && (
                  <div className={'stamp stamp-sm stamp-' + tier} title={`Xếp hạng: ${tier.toUpperCase()}`}>
                    <Icon name="check" />
                  </div>
                )}
              </div>

              <div className="ph-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name={isEmployer ? 'building' : 'graduation'} style={{ width: 14, height: 14 }} />
                  <span>
                    {isEmployer
                      ? (state.currentUser?.industry || 'Doanh nghiệp đối tác · SkillBridge')
                      : (kycData?.school || state.currentUser?.school || 'Đại học FPT')}
                  </span>
                </span>

                {/* Badge Xác thực eKYC */}
                {kycData?.kycStatus === 'verified' && (
                  <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="shield-check" style={{ width: 12, height: 12 }} />
                    <span>{isEmployer ? 'Doanh nghiệp đã xác thực eKYC' : 'Sinh viên đã xác thực eKYC'}</span>
                  </span>
                )}
                {kycData?.kycStatus === 'pending' && (
                  <span className="chip" style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="clock" style={{ width: 12, height: 12 }} />
                    <span>eKYC đang chờ xét duyệt</span>
                  </span>
                )}
                {(!kycData || kycData.kycStatus === 'unverified' || kycData.kycStatus === 'rejected' || kycData.kycStatus === 'expired') && (
                  <button
                    type="button"
                    onClick={() => openModal?.('kyc', { onSubmitted: fetchKyc })}
                    className="chip"
                    style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: '1px solid' }}
                    title="Bấm để xác thực danh tính ngay"
                  >
                    <Icon name="alert-circle" style={{ width: 12, height: 12 }} />
                    <span>Chưa xác thực eKYC · Bấm để gửi hồ sơ</span>
                  </button>
                )}
              </div>

              {/* Tags & Huy hiệu */}
              <div className="ph-meta" style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {!isEmployer ? (
                  <>
                    {activeSkills.map((skill, sIdx) => (
                      <span key={sIdx} className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="check-circle" style={{ width: 12, height: 12 }} />
                        <span>{skill}</span>
                      </span>
                    ))}
                    <span className="chip chip-lime">{TIER_LABEL[tier]}</span>
                  </>
                ) : (
                  <>
                    <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="building" style={{ width: 12, height: 12 }} />
                      <span>Nhà tuyển dụng xác thực</span>
                    </span>
                    {state.currentUser?.taxCode && (
                      <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>
                        MST: {state.currentUser.taxCode}
                      </span>
                    )}
                  </>
                )}
                {userPlanCode && userPlanCode !== 'FREE' ? (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className="chip"
                    style={{ background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.3)', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    title="Bấm để xem & quản lý gói đặc quyền"
                  >
                    <UserTierBadge planCode={userPlanCode} userRole={isEmployer ? 'employer' : 'student'} variant="icon-only" size="sm" />
                    <span>Gói {userPlanCode.replace('STU_', '').replace('EMP_', '')} đang hoạt động</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/pricing')}
                    className="chip"
                    style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,.2)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    title="Nâng cấp gói để nhận huy hiệu và giảm phí sàn"
                  >
                    <Icon name="sparkles" style={{ width: 12, height: 12, color: '#f59e0b' }} />
                    <span>Nâng cấp gói tài khoản</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="ph-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate(publicProfileUrl)}
                title="Xem hồ sơ như đối tác bên ngoài nhìn thấy"
              >
                <Icon name="eye" style={{ width: 14, height: 14 }} />
                <span>Xem công khai</span>
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate('/settings/profile')}
              >
                <Icon name="settings" style={{ width: 14, height: 14 }} />
                <span>Cài đặt hồ sơ</span>
              </button>
              {!isEmployer && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => navigate('/settings/cv')}
                >
                  <Icon name="file-text" style={{ width: 14, height: 14 }} />
                  <span>Quản lý CV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="wrap profile-body">
        <div className="pb-grid">
          {/* CỘT TRÁI */}
          <div>
            {!isEmployer ? (
              <>
                {/* 1. Điểm Reliability & Lộ trình Thăng Hạng (Dành riêng Sinh viên) */}
                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0 }}>Điểm Reliability & Lộ trình Thăng Hạng</h4>
                    <span className="chip chip-lime" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="award" style={{ width: 12, height: 12 }} />
                      <span>{tier === 'gold' ? 'Đang đạt Hạng Vàng' : (tier === 'silver' ? 'Đang đạt Hạng Bạc' : 'Hạng Khởi Đầu')}</span>
                    </span>
                  </div>

                  <div className="score-wrap">
                    <div className="score-num">{reliability} / 100</div>
                    <div className="score-bar"><div className="score-fill" style={{ width: `${Math.min(100, Math.max(0, reliability))}%` }} /></div>
                  </div>
                  <div className="score-note" style={{ marginBottom: 16 }}>
                    Điểm số dựa trên tỷ lệ giao bài đúng hạn và đánh giá hài lòng từ nhà tuyển dụng.
                  </div>

                  {/* 3-Tier Milestone Stepper */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface-2, rgba(0,0,0,0.02))', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                      <Icon name="award" style={{ width: 14, height: 14, color: 'var(--primary)', marginRight: 6 }} />
                      <span>3 Mốc Hạng Uy Tín Nền Tảng:</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                      {/* Bronze */}
                      <div style={{ padding: 10, borderRadius: 10, border: tier === 'bronze' ? '2px solid #b45309' : '1px solid var(--border)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#b45309' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#b45309' }} />
                          <span>Đồng (Bronze)</span>
                          {tier === 'bronze' && <Icon name="check" style={{ width: 13, height: 13, marginLeft: 'auto' }} />}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                          • Dưới 85 điểm<br />
                          • Hạng khởi đầu cơ bản
                        </div>
                      </div>

                      {/* Silver */}
                      <div style={{ padding: 10, borderRadius: 10, border: tier === 'silver' ? '2px solid #64748b' : '1px solid var(--border)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#64748b' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#64748b' }} />
                          <span>Bạc (Silver)</span>
                          {tier === 'silver' && <Icon name="check" style={{ width: 13, height: 13, marginLeft: 'auto' }} />}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                          • 85 – 94 điểm + ≥ 3 việc<br />
                          • Mở khóa Ứng tuyển 1 chạm
                        </div>
                      </div>

                      {/* Gold */}
                      <div style={{ padding: 10, borderRadius: 10, border: tier === 'gold' ? '2px solid #16a34a' : '1px solid var(--border)', background: tier === 'gold' ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#16a34a' }}>
                          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                          <span>Vàng (Gold)</span>
                          {tier === 'gold' && <Icon name="check" style={{ width: 13, height: 13, marginLeft: 'auto' }} />}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                          • 95 – 100 điểm + ≥ 10 việc<br />
                          • Ưu tiên ghim hồ sơ đầu bảng
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scoring Rules Table */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                      <Icon name="scale" style={{ width: 14, height: 14, color: 'var(--primary)', marginRight: 6 }} />
                      <span>Quy Tắc Tự Động Cộng / Trừ Điểm:</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                      <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        <span><b>+5 điểm:</b> Giao đúng hạn & 5 sao</span>
                      </div>
                      <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        <span><b>+3 điểm:</b> Phản hồi & giải ngân nhanh</span>
                      </div>
                      <div style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#e11d48', flexShrink: 0 }} />
                        <span><b>-10 điểm:</b> Trễ hạn không báo trước</span>
                      </div>
                      <div style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#e11d48', flexShrink: 0 }} />
                        <span><b>-15 điểm:</b> Tự ý hủy / bỏ việc</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Chỉ số năng lực chuyên sâu */}
                <div className="pcard">
                  <h4>Chỉ số năng lực chuyên sâu</h4>
                  <div className="stat-list">
                    <div className="si">
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{completedJobs}</b>
                      <span>Công việc hoàn thành</span>
                    </div>
                    <div className="si">
                      <b style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontVariantNumeric: 'tabular-nums' }}>
                        {avgStars ? (
                          <>
                            {avgStars}
                            <Icon name="star" style={{ width: 14, height: 14, color: '#eab308' }} />
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Chưa có</span>
                        )}
                      </b>
                      <span>Đánh giá trung bình</span>
                    </div>
                    <div className="si">
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{completedJobs > 0 ? '100%' : '100%'}</b>
                      <span>Giao đúng hạn (On-time)</span>
                    </div>
                    <div className="si">
                      <b>&lt; 15p</b>
                      <span>Thời gian phản hồi</span>
                    </div>
                  </div>
                </div>

                {/* 3. Huy hiệu kỹ năng */}
                <div className="pcard">
                  <h4>Huy hiệu kỹ năng đã kiểm định ({badgeList.length})</h4>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
                    Huy hiệu chứng nhận năng lực do Hệ thống & Nhà tuyển dụng đánh giá dựa trên thành tích dự án.
                  </p>

                  {loadingBadges ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                      {[1, 2].map((i) => (
                        <div key={i} style={{ height: 38, borderRadius: 10, background: 'var(--surface-2, rgba(0,0,0,0.03))', border: '1px solid var(--border)', opacity: 0.5 }} />
                      ))}
                    </div>
                  ) : badgeList.length === 0 ? (
                    <div style={{ padding: '16px', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--ink-soft)', fontSize: 12.5, textAlign: 'center' }}>
                      Bạn chưa có huy hiệu nào. Huy hiệu sẽ được hệ thống cấp tự động khi bạn hoàn thành xuất sắc các dự án theo ngành!
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                      {badgeList.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 10px',
                            background: 'var(--surface-2, rgba(0,0,0,0.02))',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            fontSize: 12
                          }}
                          title={b.grantedReason || b.description || 'Huy hiệu kỹ năng'}
                        >
                          <Icon name="award" style={{ width: 14, height: 14, color: 'var(--primary)' }} />
                          <span style={{ fontWeight: 600 }}>{b.name}</span>
                          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
                            <Icon name="check" style={{ width: 12, height: 12, color: '#16a34a' }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Việc của tôi */}
                <div className="pcard">
                  <h4>Việc làm & Dự án của bạn</h4>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 14 }}>
                    Theo dõi tiến độ bàn giao sản phẩm và các đơn ứng tuyển đang hoạt động.
                  </p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/mywork')}>Mở Việc của tôi →</button>
                </div>
              </>
            ) : (
              <>
                {/* 1. Thông tin Doanh Nghiệp (Dành riêng Doanh nghiệp) */}
                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="building" style={{ width: 18, height: 18, color: 'var(--primary)' }} />
                      <span>Thông tin Doanh nghiệp</span>
                    </h4>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/settings/profile')}
                      style={{ fontSize: 12 }}
                    >
                      <Icon name="edit" style={{ width: 13, height: 13 }} /> Sửa thông tin
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
                    <div>
                      <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Tên công ty / Doanh nghiệp:</span>
                      <b>{state.currentUser?.companyName || state.currentUser?.fullName || 'Chưa cập nhật'}</b>
                    </div>
                    {state.currentUser?.representative && (
                      <div>
                        <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Người đại diện:</span>
                        <b>{state.currentUser.representative}</b>
                      </div>
                    )}
                    {state.currentUser?.taxCode && (
                      <div>
                        <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Mã số thuế:</span>
                        <b>{state.currentUser.taxCode}</b>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Lĩnh vực hoạt động:</span>
                      <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', marginTop: 3 }}>
                        {state.currentUser?.industry || 'Truyền thông & Marketing'}
                      </span>
                    </div>
                    {state.currentUser?.address && (
                      <div>
                        <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Địa chỉ trụ sở:</span>
                        <span>{state.currentUser.address}</span>
                      </div>
                    )}
                    {state.currentUser?.website && (
                      <div>
                        <span style={{ color: 'var(--ink-soft)', display: 'block', fontSize: 12 }}>Website chính thức:</span>
                        <a href={state.currentUser.website.startsWith('http') ? state.currentUser.website : `https://${state.currentUser.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                          {state.currentUser.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Giới thiệu Doanh nghiệp (Có thể chỉnh sửa trực tiếp) */}
                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name="file-text" style={{ width: 17, height: 17, color: 'var(--primary)' }} />
                      <span>Về Chúng Tôi</span>
                    </h4>
                    {!isEditingBio && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setCompanyBio(effectiveUser?.companyDescription || effectiveUser?.bio || '');
                          setIsEditingBio(true);
                        }}
                        style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      >
                        <Icon name="edit" style={{ width: 13, height: 13 }} /> Chỉnh sửa
                      </button>
                    )}
                  </div>

                  {isEditingBio ? (
                    <div>
                      <textarea
                        value={companyBio}
                        onChange={(e) => setCompanyBio(e.target.value)}
                        placeholder="Nhập phần mô tả giới thiệu về công ty, quy mô, văn hóa làm việc và sứ mệnh..."
                        rows={5}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: 13.5,
                          lineHeight: 1.6,
                          fontFamily: 'inherit',
                          background: 'var(--surface)',
                          color: 'var(--ink)',
                          resize: 'vertical',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setIsEditingBio(false)}
                          disabled={savingBio}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleSaveCompanyBio}
                          disabled={savingBio}
                        >
                          {savingBio ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {effectiveUser?.companyDescription || effectiveUser?.bio || 'Doanh nghiệp chưa cập nhật phần mô tả giới thiệu. Bấm vào nút "Chỉnh sửa" để viết lời giới thiệu đến các bạn sinh viên.'}
                    </p>
                  )}
                </div>

                {/* 3. Hoạt động tuyển dụng */}
                <div className="pcard">
                  <h4 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="briefcase" style={{ width: 17, height: 17, color: 'var(--primary)' }} />
                    <span>Hoạt động Tuyển dụng</span>
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
                    Đăng tin tuyển dụng sinh viên cho các dự án ngắn hạn hoặc quản lý danh sách hồ sơ ứng viên đang chờ duyệt.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => navigate('/employer/post-job')}
                    >
                      <Icon name="plus" style={{ width: 13, height: 13 }} /> Đăng tin tuyển dụng mới
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      onClick={() => navigate('/employer/jobs')}
                    >
                      <Icon name="user" style={{ width: 13, height: 13 }} /> Quản lý tin đăng & Ứng viên
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Đánh giá từ đối tác (Dữ liệu thật từ Database) */}
            <div className="pcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Đánh giá từ cộng đồng ({reviews.length})</h4>
                {avgStars && (
                  <span className="chip chip-lime" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="star" style={{ width: 12, height: 12, color: '#eab308' }} />
                    <span>Trung bình: {avgStars} / 5.0</span>
                  </span>
                )}
              </div>

              {loadingReviews ? (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                  Đang tải danh sách đánh giá…
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ padding: '24px 16px', border: '1px dashed var(--border)', borderRadius: 12, textAlign: 'center', color: 'var(--ink-soft)' }}>
                  <Icon name="star" style={{ width: 28, height: 28, color: 'var(--ink-soft)', opacity: 0.4, marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Chưa có đánh giá nào</p>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>Hoàn thành công việc đầu tiên để nhận đánh giá và phản hồi từ nhà tuyển dụng!</span>
                </div>
              ) : (
                reviews.map((r) => (
                  <div className="review" key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="rv-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <b>{r.reviewerName || 'Nhà tuyển dụng'}</b>
                        {r.jobTitle && <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginLeft: 8 }}>· {r.jobTitle}</span>}
                      </div>
                      <span className="stars" style={{ display: 'inline-flex', gap: 2 }}>
                        {Array.from({ length: r.stars || 5 }).map((_, idx) => (
                          <Icon key={idx} name="star" style={{ width: 12, height: 12, color: '#eab308' }} />
                        ))}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--ink)' }}>{r.comment || 'Đánh giá tốt cho kết quả dự án.'}</p>
                    {r.createdAt && (
                      <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CỘT PHẢI */}
          <div>
            {!isEmployer ? (
              <>
                {/* 1. Danh sách CV Chuyên môn (Backend Data) */}
                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="folder" style={{ width: 16, height: 16, color: 'var(--primary)' }} />
                      <span>CV Chuyên môn ({cvList.length}/5)</span>
                    </h4>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: 11.5, padding: '3px 8px' }}
                      onClick={() => navigate('/settings/cv')}
                      aria-label="Đi đến trang Quản lý CV chi tiết"
                    >
                      <Icon name="settings" style={{ width: 12, height: 12 }} /> Quản lý CV
                    </button>
                  </div>

                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.5 }}>
                    Các bản CV chuyên ngành được lưu trữ bảo mật trên hệ thống và tự động gợi ý khi bạn ứng tuyển việc làm.
                  </p>

                  {/* Quota Progress Bar */}
                  <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.03))', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>Hạn mức lưu trữ CV</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: cvList.length >= 5 ? 'var(--coral)' : cvList.length === 4 ? '#f59e0b' : 'var(--primary)' }}>
                        {cvList.length} / 5 bản CV
                      </span>
                    </div>
                    <div style={{ height: 5, width: '100%', background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (cvList.length / 5) * 100)}%`,
                          background: cvList.length >= 5 ? 'var(--coral)' : cvList.length === 4 ? '#f59e0b' : 'var(--primary)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>

                  {loadingCvs ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {[1, 2].map((i) => (
                        <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-2, rgba(0,0,0,0.02))', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--border)', opacity: 0.5 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ height: 14, width: '45%', background: 'var(--border)', borderRadius: 4, marginBottom: 6, opacity: 0.5 }} />
                            <div style={{ height: 10, width: '65%', background: 'var(--border)', borderRadius: 4, opacity: 0.3 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : cvList.length === 0 ? (
                    <div style={{ padding: '18px 16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--ink-soft)', fontSize: 12.5, marginBottom: 12 }}>
                      Bạn chưa có bản CV nào. Hãy nhấn nút bên dưới để tải lên CV chuyên ngành đầu tiên!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {cvList.map((cv) => (
                        <div
                          key={cv.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: 'var(--surface-2, rgba(0,0,0,0.02))',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            fontSize: 12.5
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, marginRight: 8 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)', flexShrink: 0 }}>
                              <Icon name="file-text" style={{ width: 18, height: 18 }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <b style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cv.label || cv.fileName}
                              </b>
                              <div style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                                {cv.categoryName ? (
                                  <span className="chip chip-lime" style={{ fontSize: 10, padding: '1px 6px' }}>{cv.categoryName}</span>
                                ) : (
                                  <span className="chip" style={{ fontSize: 10, padding: '1px 6px', color: 'var(--coral)' }}>Chưa phân ngành</span>
                                )}
                                <span>{formatBytes(cv.fileSize)}</span>
                                <span>•</span>
                                {cv.isSearchable ? (
                                  <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 3 }} title="Cho phép nhà tuyển dụng tìm thấy khi tra cứu ứng viên">
                                    <Icon name="search" style={{ width: 10, height: 10 }} /> Cho phép tìm kiếm
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 3 }} title="Chỉ sử dụng khi bạn chủ động nộp hồ sơ">
                                    <Icon name="lock" style={{ width: 10, height: 10 }} /> Chỉ dùng ứng tuyển
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => downloadCandidateCv(cv.id, cv.fileName)}
                              title="Tải về xem file CV"
                              aria-label={`Tải về xem file CV ${cv.label || cv.fileName}`}
                            >
                              <Icon name="download" style={{ width: 11, height: 11 }} /> Tải về
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline btn-sm btn-block"
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12.5 }}
                    onClick={() => navigate('/settings/cv')}
                    aria-label="Mở trang Quản lý và thêm mới CV"
                  >
                    <Icon name="plus" style={{ width: 13, height: 13 }} />
                    <span>Quản lý & Thêm mới CV ({cvList.length}/5)</span>
                  </button>
                </div>

                {/* 2. Portfolio & Dự án thực tế (Database Data) */}
                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0 }}>Portfolio & Tác phẩm ({portfolioList.length})</h4>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
                    Tải lên các sản phẩm mẫu, mockup, hình ảnh thiết kế thực tế để chứng minh năng lực chuyên môn.
                  </p>

                  <div className="upload-zone" style={{ marginBottom: 14 }} onClick={() => portfolioInputRef.current?.click()}>
                    <input ref={portfolioInputRef} type="file" accept="image/*,.pdf" onChange={onPortfolioChange} style={{ display: 'none' }} />
                    <div className="uz-ic" style={{ color: 'var(--primary)' }}>
                      <Icon name="image" style={{ width: 26, height: 26 }} />
                    </div>
                    <b>Tải thêm tác phẩm vào Portfolio</b>
                    <span>Hỗ trợ ảnh JPG, PNG, WEBP, PDF (Tối đa 15 MB)</span>
                  </div>

                  {loadingPortfolio ? (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                      Đang tải danh sách Portfolio…
                    </div>
                  ) : portfolioList.length === 0 ? (
                    <div style={{ padding: '24px 16px', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center' }}>
                      Bạn chưa có tác phẩm nào trong Portfolio. Hãy nhấn vào ô phía trên để tải lên sản phẩm đầu tiên!
                    </div>
                  ) : (
                    <div className="portfolio-grid">
                      {portfolioList.map((p) => {
                        const isImg = !p.fileType || p.fileType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(p.fileName);
                        return (
                          <div
                            className="pf-item"
                            key={p.id}
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => setSelectedPf({ title: p.fileName, fileUrl: p.fileUrl, isImg, uploadedAt: p.uploadedAt, fileSizeBytes: p.fileSizeBytes })}
                          >
                            <div
                              className="pf-thumb"
                              style={
                                isImg && p.fileUrl
                                  ? { backgroundImage: `url(${p.fileUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                                  : { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(108,76,255,0.18), rgba(87,199,255,0.18))' }
                              }
                            >
                              {!isImg && <Icon name="file-text" style={{ width: 32, height: 32, color: 'var(--primary)' }} />}
                            </div>
                            <div className="pf-cap" title={p.fileName}>{p.fileName}</div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePortfolio(p.id, p.fileName);
                              }}
                              title="Xóa khỏi Portfolio"
                              aria-label={`Xóa tác phẩm ${p.fileName}`}
                              style={{
                                position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)',
                                color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <Icon name="x" style={{ width: 12, height: 12 }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Giấy tờ & Hồ sơ Doanh nghiệp */}
                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ margin: 0 }}>Hồ sơ Pháp lý & Xác thực</h4>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('/settings/kyc')}
                      style={{ fontSize: 11.5 }}
                    >
                      <Icon name="shield-check" style={{ width: 12, height: 12 }} /> Trang eKYC
                    </button>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.55 }}>
                    Giấy phép kinh doanh và tài liệu pháp lý giúp hồ sơ doanh nghiệp đạt mức độ uy tín cao nhất khi đăng tin.
                  </p>

                  <div className="upload-zone" onClick={() => docInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                    <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={onDocsChange} style={{ display: 'none' }} />
                    <div className="uz-ic" style={{ color: 'var(--primary)' }}>
                      <Icon name="building" style={{ width: 26, height: 26 }} />
                    </div>
                    <b>Tải thêm giấy phép KD / Giới thiệu công ty</b>
                    <span>Hỗ trợ file PDF, Ảnh chụp rõ nét</span>
                  </div>

                  {(state.employerDocs || []).length > 0 && (
                    <div className="file-chip-row" style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(state.employerDocs || []).map((f, i) => (
                        <span className="chip" key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="paperclip" style={{ width: 12, height: 12 }} />
                          <span>{f.name}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeEmployerDoc(i); }}
                            style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <Icon name="x" style={{ width: 12, height: 12 }} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Lightbox Modal */}
      {selectedPf && (
        <ModalShell onClose={() => setSelectedPf(null)}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            {selectedPf.isImg && selectedPf.fileUrl ? (
              <img src={selectedPf.fileUrl} alt={selectedPf.title} style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 10, objectFit: 'contain' }} />
            ) : (
              <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(108,76,255,0.15), rgba(87,199,255,0.15))', borderRadius: 10, gap: 8 }}>
                <Icon name="file-text" style={{ width: 48, height: 48, color: 'var(--primary)' }} />
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Định dạng tài liệu / minh chứng</span>
              </div>
            )}
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 6, wordBreak: 'break-all' }}>{selectedPf.title}</h3>
          <span className="chip chip-lime" style={{ marginBottom: 10, display: 'inline-block' }}>Tác phẩm thực tế</span>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            {selectedPf.uploadedAt ? `Ngày tải lên: ${formatDate(selectedPf.uploadedAt)}` : ''}
            {selectedPf.fileSizeBytes ? ` • Dung lượng: ${(selectedPf.fileSizeBytes / 1024).toFixed(0)} KB` : ''}
          </p>
          <div className="modal-actions" style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {selectedPf.fileUrl && (
              <a href={selectedPf.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <Icon name="external-link" style={{ width: 14, height: 14 }} />
                Mở tệp gốc
              </a>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setSelectedPf(null)}>Đóng</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
