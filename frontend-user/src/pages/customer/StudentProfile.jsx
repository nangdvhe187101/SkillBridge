import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Pagination from '../../components/Pagination';
import ModalShell from '../../components/modals/ModalShell';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { talentApi } from '../../api/talentApi';
import { getMyJobs } from '../../api/jobApi';
import { getPublicStudentProfile, uploadAvatar, uploadCover } from '../../api/userApi';
import { slugify } from '../../data/companies';

function tierFromScore(score) {
  if (score >= 95) return 'gold';
  if (score >= 85) return 'silver';
  return 'bronze';
}
const TIER_LABEL = { gold: 'Gold Tier', silver: 'Silver Tier', bronze: 'Bronze Tier' };

export default function StudentProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state, dispatch, openChatWithPerson } = useStore();
  const { showToast } = useToast();
  const avatarInputRef = useRef();
  const coverInputRef = useRef();

  const [tab, setTab] = useState('overview'); // 'overview' | 'experience' | 'portfolio' | 'reviews'
  const [selectedPf, setSelectedPf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiStudent, setApiStudent] = useState(null);

  // Invite Talent State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const currentUser = state?.currentUser;
  const userSlug = slugify(currentUser?.fullName || '');
  const displaySlug = slugify(state?.displayName || '');
  const isSelf = Boolean(currentUser && (
    String(currentUser.id) === slug ||
    userSlug === slug ||
    displaySlug === slug ||
    userSlug.replace(/-\d+$/, '') === String(slug).replace(/-\d+$/, '')
  ));

  const onAvatarChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      showToast('Đang tải lên ảnh đại diện…', 'hourglass');
      const res = await uploadAvatar(f);
      const newAvatarUrl = res.avatarUrl || res.data?.avatarUrl;
      if (newAvatarUrl) {
        setApiStudent((prev) => (prev ? { ...prev, avatarUrl: newAvatarUrl } : prev));
        if (dispatch) {
          dispatch({ type: 'UPDATE_PROFILE', patch: { avatarUrl: newAvatarUrl } });
        }
      }
      showToast('Đã cập nhật ảnh đại diện mới!', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể tải lên ảnh đại diện.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const onCoverChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      showToast('Đang tải lên ảnh bìa…', 'hourglass');
      const res = await uploadCover(f);
      const newCoverUrl = res.coverImageUrl || res.data?.coverImageUrl;
      if (newCoverUrl) {
        setApiStudent((prev) => (prev ? { ...prev, coverImageUrl: newCoverUrl } : prev));
        if (dispatch) {
          dispatch({ type: 'UPDATE_PROFILE', patch: { coverImageUrl: newCoverUrl } });
        }
      }
      showToast('Đã cập nhật ảnh bìa mới!', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể tải lên ảnh bìa.', 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchStudent = async () => {
      setLoading(true);
      let targetId = null;
      if (/^\d+$/.test(slug)) {
        targetId = parseInt(slug, 10);
      } else if (isSelf && currentUser?.id) {
        targetId = currentUser.id;
      }

      if (targetId) {
        try {
          const data = await getPublicStudentProfile(targetId);
          if (isMounted) setApiStudent(data);
        } catch (err) {
          console.warn('Lỗi khi lấy thông tin sinh viên từ API:', err);
        }
      }
      if (isMounted) setLoading(false);
    };

    fetchStudent();
    return () => { isMounted = false; };
  }, [slug, isSelf, currentUser?.id]);

  // Hợp nhất dữ liệu: API thật > currentUser (nếu isSelf) > Fallback
  const student = useMemo(() => {
    const currentAvatar = (isSelf && (currentUser?.avatarUrl || currentUser?.avatar)) || apiStudent?.avatarUrl || apiStudent?.avatar || null;
    const currentCover = (isSelf && currentUser?.coverImageUrl) || apiStudent?.coverImageUrl || null;

    if (apiStudent) {
      return {
        id: apiStudent.id,
        name: (isSelf && (currentUser?.fullName || state?.displayName)) || apiStudent.fullName,
        headline: apiStudent.headline || 'Sinh viên tài năng · SkillBridge Freelancer',
        school: apiStudent.school || 'Đang cập nhật trường',
        industry: apiStudent.industry || 'Lập trình & Thiết kế',
        email: apiStudent.email,
        phone: apiStudent.phoneNumber,
        avatar: currentAvatar,
        cover: currentCover,
        reliability: apiStudent.reliabilityScore || 95,
        completedJobs: apiStudent.completedJobsCount || 0,
        avgRating: apiStudent.averageRating || 5.0,
        totalReviews: apiStudent.totalReviewsCount || 0,
        isKycVerified: apiStudent.isKycVerified,
        expectedHourlyRate: apiStudent.expectedHourlyRate,
        skills: apiStudent.skills || [],
        education: apiStudent.education || [],
        experiences: apiStudent.experiences || [],
        socialLinks: apiStudent.socialLinks || {},
        bio: apiStudent.bio || 'Sinh viên nhiệt huyết, cam kết chất lượng sản phẩm và tiến độ hoàn thành đúng hạn trên SkillBridge.',
        portfolios: apiStudent.portfolios || [],
        reviews: apiStudent.reviews || [],
        badges: apiStudent.badges || []
      };
    }

    if (isSelf && currentUser) {
      return {
        id: currentUser.id,
        name: currentUser.fullName || state?.displayName || 'Sinh viên SkillBridge',
        headline: currentUser.headline || 'Sinh viên tài năng · SkillBridge Freelancer',
        school: currentUser.school || 'Đại học FPT',
        industry: currentUser.industry || 'Lập trình web',
        email: currentUser.email,
        phone: currentUser.phone || currentUser.phoneNumber,
        avatar: currentAvatar,
        cover: currentCover,
        reliability: currentUser.reliabilityScore ?? state?.myReliability ?? 98,
        completedJobs: currentUser.jobsDoneCount ?? (state?.myApplications?.filter((a) => a.status === 'completed')?.length || 0),
        avgRating: 5.0,
        totalReviews: 0,
        isKycVerified: currentUser.kycStatus === 'verified',
        expectedHourlyRate: currentUser.expectedHourlyRate,
        skills: Array.isArray(currentUser.skills) && currentUser.skills.length > 0
          ? currentUser.skills
          : ['Kỹ năng chuyên môn', 'Làm việc nhóm', 'Đúng hạn deadline'],
        education: Array.isArray(currentUser.education) ? currentUser.education : [],
        experiences: Array.isArray(currentUser.experiences) ? currentUser.experiences : [],
        socialLinks: currentUser.socialLinks || {},
        bio: currentUser.bio || currentUser.companyDescription || 'Sinh viên nhiệt huyết, cam kết hoàn thành công việc đúng tiến độ với tinh thần trách nhiệm cao nhất.',
        portfolios: [],
        reviews: [],
        badges: []
      };
    }

    let formattedName = slug ? slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Sinh viên SkillBridge';
    return {
      id: /^\d+$/.test(slug) ? parseInt(slug, 10) : 0,
      name: formattedName,
      headline: 'Ứng viên tiềm năng trên SkillBridge',
      school: 'Đại học đối tác SkillBridge',
      industry: 'Chuyên môn ứng dụng',
      email: null,
      phone: null,
      avatar: currentAvatar,
      cover: currentCover,
      reliability: 95,
      completedJobs: 4,
      avgRating: 5.0,
      totalReviews: 1,
      isKycVerified: true,
      skills: ['Kỹ năng chuyên môn', 'Giao tiếp tốt', 'Trách nhiệm cao'],
      education: [],
      experiences: [],
      socialLinks: {},
      bio: 'Sinh viên năng động, cam kết chất lượng sản phẩm và tiến độ hoàn thành đúng hạn trên SkillBridge.',
      portfolios: [],
      reviews: [],
      badges: []
    };
  }, [apiStudent, isSelf, currentUser, slug, state?.displayName, state?.myReliability, state?.myApplications]);

  const tier = tierFromScore(student.reliability || 95);
  const skillsList = student.skills || [];
  const portfoliosList = student.portfolios || [];
  const reviewsList = student.reviews || [];

  const [portfolioPage, setPortfolioPage] = useState(1);
  const [portfolioPageSize, setPortfolioPageSize] = useState(6);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPageSize, setReviewsPageSize] = useState(5);

  const portfolioTotalPages = Math.ceil(portfoliosList.length / portfolioPageSize) || 1;
  const pagedPortfolios = useMemo(() => {
    const start = (portfolioPage - 1) * portfolioPageSize;
    return portfoliosList.slice(start, start + portfolioPageSize);
  }, [portfoliosList, portfolioPage, portfolioPageSize]);

  const reviewsTotalPages = Math.ceil(reviewsList.length / reviewsPageSize) || 1;
  const pagedReviews = useMemo(() => {
    const start = (reviewsPage - 1) * reviewsPageSize;
    return reviewsList.slice(start, start + reviewsPageSize);
  }, [reviewsList, reviewsPage, reviewsPageSize]);

  // Mở modal mời ứng tuyển
  const handleOpenInvite = async () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập tài khoản Nhà tuyển dụng để mời nhận việc.', 'info');
      navigate('/login');
      return;
    }
    const role = (currentUser.roleCode || currentUser.role || '').toLowerCase();
    if (role !== 'employer' && role !== 'recruiter' && role !== 'business') {
      showToast('Chỉ tài khoản Nhà tuyển dụng mới có thể gửi lời mời làm việc trực tiếp.', 'warning');
      return;
    }

    setInviteModalOpen(true);
    setInviteMessage(`Chào ${student.name}, chúng tôi rất ấn tượng với hồ sơ và kỹ năng của bạn trên SkillBridge. Mời bạn xem và ứng tuyển vào dự án của chúng tôi!`);

    try {
      setLoadingJobs(true);
      const res = await getMyJobs('open', 1, 50);
      const jobs = res?.data?.items || res?.data || res?.items || [];
      const list = Array.isArray(jobs) ? jobs : [];
      setEmployerJobs(list);
      if (list.length > 0) {
        setSelectedJobId(String(list[0].id));
      }
    } catch {
      setEmployerJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const copyLink = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
    showToast('Đã sao chép đường dẫn hồ sơ ứng viên!', 'copy');
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      showToast('Vui lòng chọn một công việc bạn đang tuyển dụng.', 'warning');
      return;
    }

    try {
      setInviting(true);
      const targetId = student?.id;
      if (!targetId) {
        showToast('Không xác định được mã ứng viên để gửi lời mời.', 'error');
        return;
      }

      const res = await talentApi.inviteTalent(targetId, {
        jobId: parseInt(selectedJobId, 10),
        message: inviteMessage.trim() || undefined,
      });

      if (res?.success || res?.data?.success) {
        showToast(`Đã gửi lời mời làm việc thành công đến ${student.name}!`, 'success');
        setInviteModalOpen(false);
      } else {
        showToast(res?.message || 'Gửi lời mời thất bại, vui lòng kiểm tra hạn mức gói dịch vụ.', 'error');
      }
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra khi gửi lời mời nhận việc.', 'error');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 14, color: 'var(--ink-soft)' }}>Đang tải hồ sơ ứng viên...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page active" style={{ background: 'var(--bg-subtle, #f8fafc)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Hidden file inputs for avatar/cover upload */}
      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarChange} />
      <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onCoverChange} />

      {/* Cover Banner */}
      <div
        style={{
          height: 220,
          background: student.cover
            ? `url(${student.cover}) center/cover no-repeat`
            : 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #7c3aed 100%)',
          position: 'relative'
        }}
      >
        <div className="wrap" style={{ position: 'relative', height: '100%' }}>
          <a
            href="#"
            className="back-link"
            onClick={(e) => { e.preventDefault(); navigate(-1); }}
            style={{
              position: 'absolute',
              top: 20,
              left: 0,
              color: '#fff',
              background: 'rgba(0,0,0,0.4)',
              padding: '6px 14px',
              borderRadius: 20,
              backdropFilter: 'blur(6px)',
              textDecoration: 'none',
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Icon name="chevleft" width="14" height="14" /> Quay lại
          </a>

          {isSelf && (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: 16,
                right: 0,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '6px 14px',
                borderRadius: 20,
                backdropFilter: 'blur(6px)',
                fontSize: 12.5,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Icon name="camera" width="14" height="14" /> Đổi ảnh bìa
            </button>
          )}
        </div>
      </div>

      <div className="wrap" style={{ position: 'relative', zIndex: 10, marginTop: -65 }}>
        {/* Profile Identity Card */}
        <div
          style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: 18,
            padding: '28px 32px',
            border: '1px solid var(--line, #e2e8f0)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                src={student.avatar}
                name={student.name}
                fontSize={34}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: '4px solid #fff',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  cursor: isSelf ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (isSelf) avatarInputRef.current?.click();
                }}
              />
              {isSelf && (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Thay đổi ảnh đại diện"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: '#4f46e5',
                    color: '#fff',
                    border: '2px solid #fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  <Icon name="camera" width="14" height="14" />
                </button>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>{student.name}</h1>
                <span className={'stamp stamp-sm stamp-' + tier} title={`Xếp hạng: ${tier.toUpperCase()}`}>
                  <Icon name="check" width="12" height="12" />
                </span>
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '3px 8px' }}>
                  {TIER_LABEL[tier]}
                </span>
                {student.isKycVerified && (
                  <span className="chip" style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="shield-check" width="12" height="12" />
                    <span>Đã xác thực eKYC</span>
                  </span>
                )}
              </div>

              <div style={{ fontSize: 14.5, color: '#4f46e5', fontWeight: 600, marginTop: 4 }}>
                {student.headline}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: 13, color: 'var(--ink-soft, #64748b)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="graduation" width="14" height="14" /> {student.school}
                </span>
                {student.industry && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="briefcase" width="14" height="14" /> {student.industry}
                  </span>
                )}
                {student.expectedHourlyRate ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#059669', fontWeight: 600, background: '#ecfdf5', padding: '2px 8px', borderRadius: 6, border: '1px solid #a7f3d0' }}>
                    <Icon name="coins" width="14" height="14" /> {Number(student.expectedHourlyRate).toLocaleString('vi-VN')} đ/giờ
                  </span>
                ) : null}
                {student.phone && isSelf && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="phone" width="14" height="14" /> {student.phone}
                  </span>
                )}
                {student.website && (
                  <a
                    href={student.website.startsWith('http') ? student.website : `https://${student.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Icon name="link" width="13" height="13" /> Portfolio online
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={copyLink}
                title="Chia sẻ hồ sơ"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Icon name="share" width="14" height="14" />
                <span>Chia sẻ</span>
              </button>

              {!isSelf && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openChatWithPerson(student.name)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon name="chat" width="14" height="14" />
                  <span>Nhắn tin</span>
                </button>
              )}

              {isSelf ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/settings/profile')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <Icon name="settings" width="14" height="14" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenInvite}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <Icon name="briefcase" width="14" height="14" />
                  <span>Mời nhận việc</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bento */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid var(--line, #e2e8f0)'
            }}
          >
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Điểm tín nhiệm Freelancer</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>{student.reliability} / 100</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Dự án đã hoàn thành</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4f46e5', marginTop: 2 }}>{student.completedJobs} công việc</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đánh giá trung bình</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="star" width="16" height="16" color="#f59e0b" />
                <span>{student.avgRating}</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)' }}>({student.totalReviews} đánh giá)</span>
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Tác phẩm Portfolio</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0284c7', marginTop: 2 }}>{portfoliosList.length} dự án</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, borderBottom: '1px solid var(--line, #e2e8f0)', paddingBottom: 10 }}>
          <button
            type="button"
            className={'btn btn-sm ' + (tab === 'overview' ? 'btn-primary' : 'btn-outline')}
            onClick={() => setTab('overview')}
            style={{ borderRadius: 20 }}
          >
            Tổng quan & Kỹ năng
          </button>
          <button
            type="button"
            className={'btn btn-sm ' + (tab === 'experience' ? 'btn-primary' : 'btn-outline')}
            onClick={() => setTab('experience')}
            style={{ borderRadius: 20 }}
          >
            Học vấn & Kinh nghiệm
          </button>
          <button
            type="button"
            className={'btn btn-sm ' + (tab === 'portfolio' ? 'btn-primary' : 'btn-outline')}
            onClick={() => setTab('portfolio')}
            style={{ borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Tác phẩm Portfolio</span>
            <span style={{ background: tab === 'portfolio' ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: tab === 'portfolio' ? '#fff' : '#475569', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>
              {portfoliosList.length}
            </span>
          </button>
          <button
            type="button"
            className={'btn btn-sm ' + (tab === 'reviews' ? 'btn-primary' : 'btn-outline')}
            onClick={() => setTab('reviews')}
            style={{ borderRadius: 20 }}
          >
            Đánh giá từ đối tác ({reviewsList.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 20 }}>
            <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 14, padding: 24, border: '1px solid var(--line, #e2e8f0)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Giới thiệu bản thân</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--ink, #1e293b)', whiteSpace: 'pre-line' }}>
                {student.bio}
              </p>

              <h4 style={{ margin: '24px 0 12px', fontSize: 15, fontWeight: 600 }}>Kỹ năng chuyên môn</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {skillsList.map((s, idx) => (
                  <span key={idx} className="chip chip-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', fontSize: 12.5 }}>
                    <Icon name="check" width="12" height="12" />
                    <span>{s}</span>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 14, padding: 24, border: '1px solid var(--line, #e2e8f0)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Liên kết & Mạng xã hội</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5 }}>
                {student.socialLinks?.github && (
                  <a href={student.socialLinks.github} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#334155', textDecoration: 'none' }}>
                    <Icon name="link" width="15" height="15" />
                    <span>GitHub: {student.socialLinks.github.replace('https://github.com/', '')}</span>
                  </a>
                )}
                {student.socialLinks?.linkedin && (
                  <a href={student.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0284c7', textDecoration: 'none' }}>
                    <Icon name="link" width="15" height="15" />
                    <span>LinkedIn Profile</span>
                  </a>
                )}
                {student.socialLinks?.behance && (
                  <a href={student.socialLinks.behance} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f46e5', textDecoration: 'none' }}>
                    <Icon name="link" width="15" height="15" />
                    <span>Behance / Dribbble Portfolio</span>
                  </a>
                )}
                {(!student.socialLinks?.github && !student.socialLinks?.linkedin && !student.socialLinks?.behance) && (
                  <div style={{ color: 'var(--ink-soft)', fontStyle: 'italic', fontSize: 13 }}>
                    Chưa liên kết mạng xã hội công khai.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Education & Experiences */}
        {tab === 'experience' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 20 }}>
            {/* Education Timeline */}
            <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 14, padding: 24, border: '1px solid var(--line, #e2e8f0)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="graduation" width="18" height="18" color="#4f46e5" />
                <span>Quá trình Học vấn</span>
              </h3>

              {student.education && student.education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {student.education.map((edu, i) => (
                    <div key={i} style={{ borderLeft: '2px solid #6366f1', paddingLeft: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{edu.school}</div>
                      <div style={{ color: '#4f46e5', fontSize: 13, fontWeight: 500 }}>
                        {edu.degree} · {edu.fieldOfStudy}
                      </div>
                      {edu.startYear && edu.endYear && (
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                          {edu.startYear} - {edu.endYear}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--ink-soft)', fontStyle: 'italic', fontSize: 13 }}>
                  Đang theo học tại {student.school}.
                </div>
              )}
            </div>

            {/* Experience Timeline */}
            <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 14, padding: 24, border: '1px solid var(--line, #e2e8f0)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="briefcase" width="18" height="18" color="#16a34a" />
                <span>Kinh nghiệm & Dự án thực tế</span>
              </h3>

              {student.experiences && student.experiences.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {student.experiences.map((exp, i) => (
                    <div key={i} style={{ borderLeft: '2px solid #16a34a', paddingLeft: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{exp.role}</div>
                      <div style={{ color: '#16a34a', fontSize: 13, fontWeight: 500 }}>{exp.company}</div>
                      {exp.period && (
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{exp.period}</div>
                      )}
                      {exp.description && (
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink, #1e293b)', lineHeight: 1.6 }}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--ink-soft)', fontStyle: 'italic', fontSize: 13 }}>
                  Chưa cập nhật kinh nghiệm chi tiết.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Portfolio */}
        {tab === 'portfolio' && (
          <div style={{ marginTop: 20 }}>
            {portfoliosList.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                {pagedPortfolios.map((pf) => (
                  <div
                    key={pf.id}
                    onClick={() => setSelectedPf(pf)}
                    style={{
                      background: 'var(--bg-card, #fff)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: '1px solid var(--line, #e2e8f0)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <div style={{ height: 160, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {['jpg', 'jpeg', 'png', 'webp'].includes((pf.fileType || '').toLowerCase()) ? (
                        <img src={pf.fileUrl} alt={pf.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <Icon name="folder" width="40" height="40" color="#6366f1" />
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{(pf.fileType || 'FILE').toUpperCase()}</div>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pf.fileName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                        Bấm để xem chi tiết
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                  <Pagination
                    currentPage={portfolioPage}
                    totalPages={portfolioTotalPages}
                    totalItems={portfoliosList.length}
                    pageSize={portfolioPageSize}
                    onPageChange={setPortfolioPage}
                    onPageSizeChange={(sz) => { setPortfolioPageSize(sz); setPortfolioPage(1); }}
                    pageSizeOptions={[6, 12, 24]}
                    itemLabel="tác phẩm"
                  />
                </div>
              </>
            ) : (
              <div style={{ background: 'var(--bg-card, #fff)', padding: '50px 20px', textAlign: 'center', borderRadius: 14, border: '1px solid var(--line, #e2e8f0)' }}>
                <Icon name="folder" width="36" height="36" style={{ color: 'var(--ink-soft)', margin: '0 auto 12px' }} />
                <h4 style={{ margin: 0, fontSize: 16 }}>Chưa có tác phẩm nào trong Portfolio</h4>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>Tác phẩm tải lên sẽ xuất hiện tại đây để chứng minh năng lực thực tế.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Reviews */}
        {tab === 'reviews' && (
          <div style={{ marginTop: 20 }}>
            {reviewsList.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pagedReviews.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card, #fff)',
                      borderRadius: 14,
                      padding: 18,
                      border: '1px solid var(--line, #e2e8f0)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={r.reviewerAvatar || r.reviewerAvatarUrl} name={r.reviewerName} fontSize={14} style={{ width: 36, height: 36, borderRadius: '50%' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.reviewerName}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Dự án: {r.jobTitle}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: r.stars || 5 }).map((_, i) => (
                          <Icon key={i} name="star" width="14" height="14" color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--ink, #1e293b)', lineHeight: 1.6 }}>
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                  <Pagination
                    currentPage={reviewsPage}
                    totalPages={reviewsTotalPages}
                    totalItems={reviewsList.length}
                    pageSize={reviewsPageSize}
                    onPageChange={setReviewsPage}
                    onPageSizeChange={(sz) => { setReviewsPageSize(sz); setReviewsPage(1); }}
                    pageSizeOptions={[5, 10, 20]}
                    itemLabel="đánh giá"
                  />
                </div>
              </>
            ) : (
              <div style={{ background: 'var(--bg-card, #fff)', padding: '50px 20px', textAlign: 'center', borderRadius: 14, border: '1px solid var(--line, #e2e8f0)' }}>
                <Icon name="star" width="36" height="36" style={{ color: 'var(--ink-soft)', margin: '0 auto 12px' }} />
                <h4 style={{ margin: 0, fontSize: 16 }}>Chưa có đánh giá nào</h4>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>Nhận xét từ các Nhà tuyển dụng sẽ được cập nhật sau khi hoàn thành dự án.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Preview Modal */}
      {selectedPf && (
        <ModalShell open={!!selectedPf} onClose={() => setSelectedPf(null)} title={selectedPf.fileName}>
          <div style={{ textAlign: 'center', padding: 10 }}>
            {['jpg', 'jpeg', 'png', 'webp'].includes((selectedPf.fileType || '').toLowerCase()) ? (
              <img src={selectedPf.fileUrl} alt={selectedPf.fileName} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
            ) : (
              <div style={{ padding: 40 }}>
                <Icon name="folder" width="60" height="60" color="#6366f1" />
                <p style={{ marginTop: 12 }}>Định dạng file: {selectedPf.fileType}</p>
                {selectedPf.fileUrl && (
                  <a href={selectedPf.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                    Tải về tác phẩm
                  </a>
                )}
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <ModalShell open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title={`Mời ${student.name} ứng tuyển`}>
          <form onSubmit={handleSendInvite} style={{ padding: '4px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Chọn công việc của bạn <span style={{ color: 'var(--coral)' }}>*</span>
              </label>
              {loadingJobs ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Đang tải danh sách công việc...</div>
              ) : employerJobs.length > 0 ? (
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}
                >
                  {employerJobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--coral)' }}>
                  Bạn chưa có công việc nào đang mở tuyển. Vui lòng đăng việc mới trước khi gửi lời mời.
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Tin nhắn gửi ứng viên
              </label>
              <textarea
                rows={3}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setInviteModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={inviting || employerJobs.length === 0}>
                {inviting ? 'Đang gửi...' : 'Gửi lời mời'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}