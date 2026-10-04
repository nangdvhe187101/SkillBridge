import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Pagination from '../../components/Pagination';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { getPublicCompanyProfile } from '../../api/userApi';
import { slugify } from '../../data/companies';

export default function CompanyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state, openChatWithPerson } = useStore();
  const { showToast } = useToast();
  const [tab, setTab] = useState('overview'); // 'overview' | 'jobs' | 'reviews' | 'culture'
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiCompany, setApiCompany] = useState(null);

  const currentUser = state.currentUser;
  const isSelf = currentUser && (
    String(currentUser.id) === slug ||
    slugify(currentUser.companyName || currentUser.fullName || '') === slug
  );

  // Thử tìm job để trích xuất employerId thật từ state nếu có
  const matchedJob = (state.jobs || []).find((j) =>
    slugify(j.emp || '') === slug || String(j.employerId) === slug
  );

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      // Xác định employerId mục tiêu
      let targetId = null;
      if (/^\d+$/.test(slug)) {
        targetId = parseInt(slug, 10);
      } else if (isSelf && currentUser?.id) {
        targetId = currentUser.id;
      } else if (matchedJob?.employerId) {
        targetId = matchedJob.employerId;
      }

      if (targetId) {
        try {
          const data = await getPublicCompanyProfile(targetId);
          if (isMounted) setApiCompany(data);
        } catch (err) {
          console.warn('Không tải được API company profile, sử dụng dữ liệu dự phòng:', err);
        }
      }
      if (isMounted) setLoading(false);
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, [slug, isSelf, currentUser?.id, matchedJob?.employerId]);

  // Hợp nhất dữ liệu: API thật > currentUser (nếu isSelf) > matchedJob > fallback
  const company = useMemo(() => {
    if (apiCompany) {
      return {
        id: apiCompany.id,
        name: apiCompany.companyName,
        representative: apiCompany.representative,
        taxCode: apiCompany.taxCode,
        industry: apiCompany.industry || 'Doanh nghiệp tuyển dụng',
        size: apiCompany.companySize || '10-50 nhân sự',
        website: apiCompany.website,
        address: apiCompany.address || 'Việt Nam',
        logo: apiCompany.avatarUrl || apiCompany.logo || apiCompany.employerAvatar || null,
        cover: apiCompany.coverImageUrl,
        headline: apiCompany.headline,
        description: apiCompany.companyDescription || apiCompany.bio || 'Đơn vị tuyển dụng uy tín đã được xác thực trên nền tảng SkillBridge.',
        kycStatus: apiCompany.kycStatus,
        reliabilityScore: apiCompany.reliabilityScore,
        openJobs: apiCompany.openJobs || [],
        openJobsCount: apiCompany.openJobsCount || 0,
        totalHiredCount: apiCompany.totalHiredCount || 0,
        averageRating: apiCompany.averageRating || 5.0,
        totalReviewsCount: apiCompany.totalReviewsCount || 0,
        benefits: apiCompany.benefits || [],
        socialLinks: apiCompany.socialLinks || {},
        reviews: apiCompany.reviews || []
      };
    }

    if (isSelf && currentUser) {
      return {
        id: currentUser.id,
        name: currentUser.companyName || currentUser.fullName || 'Doanh nghiệp của bạn',
        representative: currentUser.representative || '',
        taxCode: currentUser.taxCode || 'Đang cập nhật',
        industry: currentUser.industry || 'Công nghệ & Truyền thông',
        size: currentUser.companySize || '10-50 nhân sự',
        website: currentUser.website || null,
        address: currentUser.address || 'Việt Nam',
        logo: currentUser.avatarUrl || currentUser.avatar || currentUser.logo || null,
        cover: currentUser.coverImageUrl,
        headline: currentUser.headline || '',
        description: currentUser.companyDescription || currentUser.bio || 'Đơn vị tuyển dụng uy tín trên SkillBridge.',
        kycStatus: currentUser.kycStatus || 'pending',
        reliabilityScore: currentUser.reliabilityScore || 100,
        openJobs: (state.jobs || []).filter(j => j.employerId === currentUser.id && j.status === 'open'),
        openJobsCount: (state.jobs || []).filter(j => j.employerId === currentUser.id && j.status === 'open').length,
        totalHiredCount: currentUser.jobsDoneCount || 0,
        averageRating: 5.0,
        totalReviewsCount: 0,
        benefits: currentUser.benefits || ['Môi trường chuyên nghiệp', 'Cam kết ký quỹ Escrow 100%', 'Duyệt bài đúng hẹn'],
        socialLinks: currentUser.socialLinks || {},
        reviews: []
      };
    }

    if (matchedJob) {
      const empName = matchedJob.emp || 'Doanh nghiệp SkillBridge';
      return {
        id: matchedJob.employerId || 0,
        name: empName,
        representative: 'Đại diện tuyển dụng',
        taxCode: 'Đã xác thực eKYC',
        industry: matchedJob.industry || matchedJob.cat || 'Doanh nghiệp',
        size: matchedJob.employerCompanySize || '10-50 nhân sự',
        website: matchedJob.employerWebsite || null,
        address: matchedJob.loc ? `${matchedJob.loc} · Đã xác minh` : 'Việt Nam',
        logo: matchedJob.employerAvatar || matchedJob.empAvatar || matchedJob.employerAvatarUrl || null,
        cover: null,
        headline: 'Đối tác tuyển dụng uy tín',
        description: matchedJob.companyDesc || `${empName} là đơn vị tuyển dụng uy tín đã được xác thực trên nền tảng SkillBridge.`,
        kycStatus: 'verified',
        reliabilityScore: 98,
        openJobs: (state.jobs || []).filter(j => j.emp === empName && j.status === 'open'),
        openJobsCount: (state.jobs || []).filter(j => j.emp === empName && j.status === 'open').length,
        totalHiredCount: 12,
        averageRating: 4.9,
        totalReviewsCount: 3,
        benefits: ['Hỗ trợ dấu mộc thực tập', 'Ký quỹ Escrow bảo đảm', 'Phản hồi nhanh'],
        socialLinks: {},
        reviews: [
          { reviewerName: 'Minh Anh · ĐH FPT', stars: 5, jobTitle: 'Dựng video TikTok 30s', comment: 'Doanh nghiệp duyệt bài nhanh, thanh toán đúng hạn và giao tiếp cực kỳ tôn trọng sinh viên.' },
          { reviewerName: 'Hải Đăng · ĐH Kiến Trúc', stars: 5, jobTitle: 'Thiết kế ấn phẩm đồ họa', comment: 'Brief rõ ràng, hỗ trợ tài liệu chu đáo và tạo điều kiện hết mình cho sinh viên.' }
        ]
      };
    }

    return null;
  }, [apiCompany, isSelf, currentUser, matchedJob, state.jobs]);

  const copyLink = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
    showToast('Đã sao chép đường dẫn hồ sơ doanh nghiệp!', 'copy');
  };

  if (loading) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '80px 0', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 14, color: 'var(--ink-soft)' }}>Đang tải thông tin doanh nghiệp...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 10 }}>Không tìm thấy hồ sơ doanh nghiệp này</h2>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>Hồ sơ có thể chưa được kích hoạt hoặc đường dẫn không hợp lệ.</p>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')}>Về trang Tìm việc làm</button>
        </div>
      </div>
    );
  }

  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(6);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPageSize, setReviewsPageSize] = useState(5);

  const openJobsList = company.openJobs || [];
  const reviewsList = company.reviews || [];

  const jobsTotalPages = Math.ceil(openJobsList.length / jobsPageSize) || 1;
  const pagedOpenJobs = useMemo(() => {
    const start = (jobsPage - 1) * jobsPageSize;
    return openJobsList.slice(start, start + jobsPageSize);
  }, [openJobsList, jobsPage, jobsPageSize]);

  const reviewsTotalPages = Math.ceil(reviewsList.length / reviewsPageSize) || 1;
  const pagedReviews = useMemo(() => {
    const start = (reviewsPage - 1) * reviewsPageSize;
    return reviewsList.slice(start, start + reviewsPageSize);
  }, [reviewsList, reviewsPage, reviewsPageSize]);

  return (
    <div className="page active" style={{ background: 'var(--bg-subtle, #f8fafc)', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Cover Banner */}
      <div
        style={{
          height: 240,
          background: company.cover
            ? `url(${company.cover}) center/cover no-repeat`
            : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)',
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
        </div>
      </div>

      <div className="wrap" style={{ position: 'relative', zIndex: 10, marginTop: -70 }}>
        {/* Header Profile Card */}
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
            <Avatar
              src={company.logo}
              name={company.name}
              fontSize={34}
              style={{
                width: 96,
                height: 96,
                borderRadius: 20,
                border: '4px solid #fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                flexShrink: 0
              }}
            />

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--ink, #0f172a)' }}>{company.name}</h1>
                {company.kycStatus === 'verified' && (
                  <span className="chip chip-lime" style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="shield-check" width="12" height="12" />
                    <span>Doanh nghiệp đã xác minh eKYC</span>
                  </span>
                )}
              </div>

              {company.headline && (
                <div style={{ fontSize: 14, color: '#6366f1', fontWeight: 500, marginTop: 4 }}>
                  {company.headline}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10, fontSize: 13, color: 'var(--ink-soft, #64748b)' }}>
                {company.industry && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="briefcase" width="13" height="13" /> {company.industry}
                  </span>
                )}
                {company.size && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="users" width="13" height="13" /> {company.size}
                  </span>
                )}
                {company.address && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="pin" width="13" height="13" /> {company.address}
                  </span>
                )}
                {company.taxCode && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="file-text" width="13" height="13" /> MST: {company.taxCode}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Icon name="link" width="13" height="13" /> Website
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

              {isSelf && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/settings/profile')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                >
                  <Icon name="settings" width="14" height="14" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              )}

              {!isSelf && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openChatWithPerson(company.name)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon name="chat" width="14" height="14" />
                    <span>Nhắn tin</span>
                  </button>

                  <button
                    type="button"
                    className={'btn btn-sm ' + (following ? 'btn-outline' : 'btn-primary')}
                    onClick={() => setFollowing((f) => !f)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {following ? (
                      <>
                        <Icon name="check" width="13" height="13" />
                        <span>Đang theo dõi</span>
                      </>
                    ) : (
                      '+ Theo dõi'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats Bento */}
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
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Việc làm đang tuyển</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4f46e5', marginTop: 2 }}>{openJobsList.length} vị trí</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Dự án đã nghiệm thu</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>{company.totalHiredCount} dự án</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Điểm uy tín đối tác</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d97706', marginTop: 2 }}>{company.reliabilityScore} / 100</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-subtle, #f8fafc)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đánh giá trung bình</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ea580c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="star" width="16" height="16" color="#f59e0b" />
                <span>{company.averageRating}</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-soft)' }}>({reviewsList.length} đánh giá)</span>
              </div>
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
            Về chúng tôi
          </button>
          <button
            type="button"
            className={'btn btn-sm ' + (tab === 'jobs' ? 'btn-primary' : 'btn-outline')}
            onClick={() => setTab('jobs')}
            style={{ borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>Việc làm đang tuyển</span>
            <span style={{ background: tab === 'jobs' ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: tab === 'jobs' ? '#fff' : '#475569', padding: '1px 7px', borderRadius: 10, fontSize: 11 }}>
              {openJobsList.length}
            </span>
          </button>
          <button
            type="button"
            className={'btn btn-sm ' + (tab === 'reviews' ? 'btn-primary' : 'btn-outline')}
            onClick={() => setTab('reviews')}
            style={{ borderRadius: 20 }}
          >
            Đánh giá từ ứng viên ({reviewsList.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginTop: 20 }}>
            <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 14, padding: 24, border: '1px solid var(--line, #e2e8f0)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Giới thiệu Doanh nghiệp</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--ink, #1e293b)', whiteSpace: 'pre-line' }}>
                {company.description}
              </p>

              {company.benefits && company.benefits.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Chế độ & Phúc lợi tiêu biểu</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {company.benefits.map((b, i) => (
                      <span key={i} className="chip chip-lime" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: 12 }}>
                        <Icon name="check" width="12" height="12" />
                        <span>{b}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-card, #fff)', borderRadius: 14, padding: 24, border: '1px solid var(--line, #e2e8f0)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Thông tin Pháp lý & Cam kết</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5 }}>
                <div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Đơn vị chủ quản</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{company.name}</div>
                </div>
                {company.representative && (
                  <div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Người đại diện theo pháp luật</div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>{company.representative}</div>
                  </div>
                )}
                {company.taxCode && (
                  <div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Mã số thuế doanh nghiệp</div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>{company.taxCode}</div>
                  </div>
                )}
                <div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Bảo chứng thanh toán SkillBridge</div>
                  <div style={{ color: '#16a34a', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="shield-check" width="14" height="14" />
                    <span>100% Ký quỹ Escrow trước khi nhận bài</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Open Jobs */}
        {tab === 'jobs' && (
          <div style={{ marginTop: 20 }}>
            {openJobsList.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {pagedOpenJobs.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      background: 'var(--bg-card, #fff)',
                      borderRadius: 14,
                      padding: 20,
                      border: '1px solid var(--line, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span className="chip" style={{ fontSize: 11, padding: '2px 8px' }}>{j.categoryName || j.cat || 'Công việc'}</span>
                        {j.isUrgent && (
                          <span className="chip chip-coral" style={{ fontSize: 11, padding: '2px 8px' }}>Gấp</span>
                        )}
                      </div>

                      <h4 style={{ margin: '10px 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--ink, #0f172a)' }}>
                        {j.title}
                      </h4>

                      <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', margin: '6px 0 12px' }}>
                        {fmtVND(j.budget)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line, #f1f5f9)', paddingTop: 12, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        {j.applicationsCount ? `${j.applicationsCount} ứng viên đã nộp` : 'Chưa có ứng viên'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/jobs/${j.id}`)}
                      >
                        Xem & Ứng tuyển
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                  <Pagination
                    currentPage={jobsPage}
                    totalPages={jobsTotalPages}
                    totalItems={openJobsList.length}
                    pageSize={jobsPageSize}
                    onPageChange={setJobsPage}
                    onPageSizeChange={(sz) => { setJobsPageSize(sz); setJobsPage(1); }}
                    pageSizeOptions={[6, 12, 24]}
                    itemLabel="việc làm"
                  />
                </div>
              </>
            ) : (
              <div style={{ background: 'var(--bg-card, #fff)', padding: '50px 20px', textAlign: 'center', borderRadius: 14, border: '1px solid var(--line, #e2e8f0)' }}>
                <Icon name="briefcase" width="36" height="36" style={{ color: 'var(--ink-soft)', margin: '0 auto 12px' }} />
                <h4 style={{ margin: 0, fontSize: 16 }}>Hiện tại doanh nghiệp chưa có công việc mới mở</h4>
                <p style={{ margin: '6px 0 16px', fontSize: 13, color: 'var(--ink-soft)' }}>Bấm nút theo dõi để nhận thông báo ngay khi doanh nghiệp đăng tuyển dự án mới!</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reviews */}
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
                <h4 style={{ margin: 0, fontSize: 16 }}>Chưa có bài đánh giá nào</h4>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>Đánh giá sẽ được hiển thị khi sinh viên hoàn thành công việc cùng doanh nghiệp.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}