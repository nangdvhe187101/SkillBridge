import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Pagination from '../../components/Pagination';
import UserTierBadge from '../../components/common/UserTierBadge';
import { useStore } from '../../context/StoreContext';
import { talentApi } from '../../api/talentApi';
import { getMyJobs, getCategories } from '../../api/jobApi';
import { slugify } from '../../data/companies';

const POPULAR_UNIVERSITIES = [
  'Đại học FPT',
  'Đại học Bách Khoa',
  'Đại học Kinh Tế Quốc Dân (NEU)',
  'Đại học Ngoại Thương (FTU)',
  'Đại học Quốc Gia Hà Nội',
  'Đại học Quốc Gia TP.HCM',
  'Học viện Công nghệ Bưu chính Viễn thông',
  'Đại học Sư phạm Kỹ thuật',
];

const POPULAR_SKILLS = [
  'React',
  'Figma',
  'NodeJS',
  'Video Editing',
  'Canva',
  'Python',
  'CapCut',
  'UI/UX Design',
  'Content Marketing',
  'Viết bài SEO',
  'TypeScript',
  'Dịch thuật',
  'Illustrator',
  'ASP.NET'
];

export default function Talents() {
  const navigate = useNavigate();
  const { state, showToast } = useStore();

  const isLoggedIn = Boolean(state.currentUser);
  const userRole = state.currentUser?.roleCode || state.role;
  const isEmployer = userRole === 'employer';
  const isStudent = userRole === 'student';

  useEffect(() => {
    if (isLoggedIn && isStudent) {
      showToast('Danh bạ nhân tài chỉ dành cho Nhà tuyển dụng tìm kiếm và mời ứng viên.', 'info');
      navigate('/jobs', { replace: true });
    }
  }, [isLoggedIn, isStudent, navigate, showToast]);

  const [talents, setTalents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Danh mục chuyên ngành từ Database
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((res) => {
        const list = res?.data || res || [];
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setDbCategories(list);
        }
      })
      .catch((err) => console.warn('Lỗi khi tải danh mục từ DB:', err));
    return () => { isMounted = false; };
  }, []);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [school, setSchool] = useState('');
  const [industry, setIndustry] = useState('');
  const [minScore, setMinScore] = useState('');
  const [rateRange, setRateRange] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Smooth scroll up when changing page
  useEffect(() => {
    if (page > 1) {
      window.scrollTo({ top: 340, behavior: 'smooth' });
    }
  }, [page]);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  // Load Talents
  const fetchTalents = useCallback(async () => {
    try {
      setLoading(true);
      let minRate;
      let maxRate;
      if (rateRange === 'under_100') {
        maxRate = 100000;
      } else if (rateRange === '100_200') {
        minRate = 100000;
        maxRate = 200000;
      } else if (rateRange === '200_400') {
        minRate = 200000;
        maxRate = 400000;
      } else if (rateRange === 'above_400') {
        minRate = 400000;
      }

      const res = await talentApi.getTalents({
        keyword: keyword.trim() || undefined,
        school: school || undefined,
        industry: industry || undefined,
        minReliabilityScore: minScore ? parseInt(minScore, 10) : undefined,
        minRate,
        maxRate,
        onlyVerified: onlyVerified ? true : undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        page,
        pageSize,
      });

      const items = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
      const total = res?.data?.totalCount ?? res?.totalCount ?? items.length;
      setTalents(items);
      setTotalCount(total);
    } catch (err) {
      console.error('Error fetching talents:', err);
      showToast('Không thể tải danh sách nhân tài. Vui lòng thử lại sau.', 'error');
    } finally {
      setLoading(false);
    }
  }, [keyword, school, industry, minScore, rateRange, onlyVerified, selectedSkills, page, showToast]);

  useEffect(() => {
    fetchTalents();
  }, [fetchTalents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTalents();
  };

  const handleToggleSkill = (skillName) => {
    setSelectedSkills((prev) => {
      const exists = prev.includes(skillName);
      if (exists) {
        return prev.filter((s) => s !== skillName);
      }
      return [...prev, skillName];
    });
    setPage(1);
  };

  const handleClearSkills = () => {
    setSelectedSkills([]);
    setPage(1);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSchool('');
    setIndustry('');
    setMinScore('');
    setRateRange('');
    setOnlyVerified(false);
    setSelectedSkills([]);
    setPage(1);
  };

  // Open Direct Invite Modal
  const handleOpenInvite = async (student) => {
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập với tư cách Nhà tuyển dụng để mời nhận việc.', 'info');
      navigate('/auth?tab=login');
      return;
    }

    if (!isEmployer) {
      showToast('Tính năng gửi lời mời nhận việc chỉ dành riêng cho Nhà tuyển dụng.', 'warning');
      return;
    }

    setSelectedStudent(student);
    setInviteModalOpen(true);
    setSelectedJobId('');
    setInviteMessage(`Chào ${student.fullName}, tôi rất ấn tượng với hồ sơ và các kỹ năng của bạn trên SkillBridge. Tôi muốn trân trọng mời bạn tham khảo và nộp hồ sơ vào dự án dưới đây.`);

    // Fetch Employer's Open Jobs
    try {
      setLoadingJobs(true);
      const res = await getMyJobs('open', 1, 50);
      const jobs = res?.data?.items || res?.items || (Array.isArray(res) ? res : []);
      setEmployerJobs(jobs);
      if (jobs.length > 0) {
        setSelectedJobId(String(jobs[0].id));
      }
    } catch (err) {
      console.error('Error loading employer jobs:', err);
      showToast('Không thể tải danh sách công việc đang tuyển của bạn.', 'error');
    } finally {
      setLoadingJobs(false);
    }
  };

  // Submit Direct Invitation
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      showToast('Vui lòng chọn một công việc bạn đang tuyển dụng.', 'warning');
      return;
    }

    try {
      setInviting(true);
      const res = await talentApi.inviteTalent(selectedStudent.id, {
        jobId: parseInt(selectedJobId, 10),
        message: inviteMessage.trim() || undefined,
      });

      if (res?.success || res?.data?.success) {
        showToast(`Đã gửi lời mời làm việc thành công đến ${selectedStudent.fullName}!`, 'success');
        setInviteModalOpen(false);
      } else {
        showToast(res?.message || 'Gửi lời mời thất bại, vui lòng kiểm tra hạn mức gói dịch vụ.', 'error');
      }
    } catch (err) {
      const errMsg = err?.message || 'Có lỗi xảy ra khi gửi lời mời nhận việc.';
      showToast(errMsg, 'error');
    } finally {
      setInviting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="page active" style={{ paddingBottom: 60 }}>
      {/* Hero Section */}
      <div
        className="talents-hero"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(236, 72, 153, 0.03) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '48px 0 36px',
          textAlign: 'center',
        }}
      >
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div
            className="sec-eyebrow"
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 2,
              color: '#6366f1',
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            DANH BẠ NHÂN TÀI SINH VIÊN SKILLBRIDGE
          </div>
          <h1
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              fontWeight: 800,
              margin: '0 0 16px',
              letterSpacing: -0.5,
              color: 'var(--ink)',
            }}
          >
            Tìm kiếm & Tuyển dụng Trực tiếp Sinh viên Xuất sắc
          </h1>
          <p
            style={{
              fontSize: 'clamp(14px, 1.8vw, 16px)',
              color: 'var(--ink-soft)',
              lineHeight: 1.6,
              maxWidth: 720,
              margin: '0 auto 28px',
            }}
          >
            Chủ động săn đón các bạn sinh viên tài năng, chuyên môn vững vàng, được bảo chứng điểm uy tín và đánh giá thực tế từ các dự án trước.
          </p>

          {/* Quick Stats Banner */}
          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              gap: 24,
              justifyContent: 'center',
              background: 'var(--surface)',
              padding: '12px 28px',
              borderRadius: 999,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              <span style={{ color: '#10b981', fontWeight: 800 }}>✓ Đã xác thực</span>
              <span style={{ color: 'var(--ink-soft)' }}>Hồ sơ sinh viên ưu tiên</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              <span style={{ color: '#6366f1', fontWeight: 800 }}>⭐ 95+</span>
              <span style={{ color: 'var(--ink-soft)' }}>Chỉ số Uy tín cao</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              <span style={{ color: '#ec4899', fontWeight: 800 }}>⚡ Trực tiếp</span>
              <span style={{ color: 'var(--ink-soft)' }}>Mời làm việc không qua trung gian</span>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 1240, marginTop: 32 }}>
        {/* Search & Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 32,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: 16,
              alignItems: 'flex-end',
            }}
          >
            {/* Search Input */}
            <div style={{ flex: 1.5 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Từ khóa / Kỹ năng
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Ví dụ: Thiết kế banner, React, Video editor..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    fontSize: 13.5,
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                  }}
                />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                  <Icon name="search" width="16" height="16" />
                </span>
              </div>
            </div>

            {/* Industry / Major */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Lĩnh vực / Chuyên ngành
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  fontSize: 13.5,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              >
                <option value="">Tất cả lĩnh vực</option>
                {dbCategories.length > 0
                  ? dbCategories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))
                  : [
                      'Lập trình Web & Ứng dụng',
                      'Thiết kế Đồ họa & UI/UX',
                      'Video & Animation',
                      'Viết bài & Dịch thuật',
                      'Marketing & Bán hàng',
                    ].map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
              </select>
            </div>

            {/* University */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Trường Đại học
              </label>
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  fontSize: 13.5,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              >
                <option value="">Tất cả trường</option>
                {POPULAR_UNIVERSITIES.map((sch) => (
                  <option key={sch} value={sch}>{sch}</option>
                ))}
              </select>
            </div>

            {/* Min Score Filter */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Độ Uy tín tối thiểu
              </label>
              <select
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  fontSize: 13.5,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              >
                <option value="">Mọi mức uy tín</option>
                <option value="95">⭐ 95+ (Master Talent)</option>
                <option value="90">⭐ 90+ (Xuất sắc)</option>
                <option value="80">⭐ 80+ (Tích cực)</option>
              </select>
            </div>

            {/* Expected Rate Filter */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Thù lao mong muốn
              </label>
              <select
                value={rateRange}
                onChange={(e) => setRateRange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  fontSize: 13.5,
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                }}
              >
                <option value="">Tất cả mức giá</option>
                <option value="under_100">Dưới 100k / giờ (Tiết kiệm)</option>
                <option value="100_200">100k – 200k / giờ (Phổ biến)</option>
                <option value="200_400">200k – 400k / giờ (Chuyên nghiệp)</option>
                <option value="above_400">Trên 400k / giờ (Chuyên gia)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  padding: '10px 20px',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13.5,
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                Lọc kết quả
              </button>
              {(keyword || school || industry || minScore || rateRange || onlyVerified || selectedSkills.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-ghost"
                  title="Đặt lại bộ lọc"
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                  }}
                >
                  <Icon name="x" width="16" height="16" />
                </button>
              )}
            </div>
          </div>

          {/* Toggle Only Verified */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => {
                  setOnlyVerified(e.target.checked);
                  setPage(1);
                }}
                style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }}
              />
              <span>Chỉ hiển thị sinh viên đã xác thực thẻ SV (Verified)</span>
            </label>
          </div>

          {/* Bộ lọc Kỹ năng chuyên sâu dạng Tag Checkbox */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--border, #e2e8f0)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                <Icon name="tag" width="14" height="14" />
                <span>Bộ lọc Kỹ năng chuyên sâu:</span>
                {selectedSkills.length > 0 && (
                  <span
                    style={{
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    Đã chọn {selectedSkills.length}
                  </span>
                )}
              </div>
              {selectedSkills.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSkills}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                  }}
                >
                  <Icon name="x" width="12" height="12" />
                  <span>Bỏ chọn tất cả</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {POPULAR_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleToggleSkill(skill)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: 12.5,
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      border: isSelected
                        ? '1.5px solid #6366f1'
                        : '1px solid var(--border, #cbd5e1)',
                      background: isSelected
                        ? '#eff6ff'
                        : 'var(--surface, #ffffff)',
                      color: isSelected ? '#3b82f6' : 'var(--ink-soft, #475569)',
                      boxShadow: isSelected
                        ? '0 2px 8px rgba(59, 130, 246, 0.15)'
                        : 'none',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        border: isSelected ? '1px solid #3b82f6' : '1px solid #94a3b8',
                        background: isSelected ? '#3b82f6' : '#fff',
                        color: '#fff',
                        fontSize: 10,
                      }}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Results Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {loading ? (
              <span>Đang tìm kiếm nhân tài...</span>
            ) : (
              <span>Tìm thấy <strong style={{ color: '#6366f1' }}>{totalCount}</strong> sinh viên xuất sắc</span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Đang tải danh bạ nhân tài...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && talents.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--surface)',
              borderRadius: 16,
              border: '1.5px dashed var(--border)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Chưa tìm thấy sinh viên phù hợp</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, maxWidth: 440, margin: '0 auto 20px' }}>
              Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc trường/ngành để tiếp cận nhiều ứng viên hơn.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-primary"
              style={{ borderRadius: 10, padding: '9px 20px' }}
            >
              Xem tất cả sinh viên
            </button>
          </div>
        )}

        {/* Talents Grid */}
        {!loading && talents.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
              gap: 22,
            }}
          >
            {talents.map((talent) => {
              const isMaster = talent.activePlanCode === 'STU_MASTER';
              const isPro = talent.activePlanCode === 'STU_PRO';
              const isOnline = (state.onlineUserIds || []).includes(Number(talent.id)) || Boolean(talent.isOnline);

              return (
                <div
                  key={talent.id}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 16,
                    border: isMaster
                      ? '1.5px solid rgba(236, 72, 153, 0.55)'
                      : isPro
                        ? '1.5px solid rgba(99, 102, 241, 0.45)'
                        : '1px solid var(--border)',
                    boxShadow: isMaster
                      ? '0 10px 30px rgba(236, 72, 153, 0.15)'
                      : isPro
                        ? '0 8px 24px rgba(99, 102, 241, 0.12)'
                        : '0 4px 16px rgba(0, 0, 0, 0.03)',
                    padding: '22px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                >
                  {/* VIP Ribbon for Master / Pro */}
                  {isMaster && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: 14,
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 10px',
                        borderRadius: 999,
                        letterSpacing: 0.5,
                        boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)',
                      }}
                    >
                      ★ MASTER TALENT
                    </div>
                  )}

                  {isPro && !isMaster && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: 14,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 10px',
                        borderRadius: 999,
                        letterSpacing: 0.5,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      PRO FREELANCER
                    </div>
                  )}

                  <div>
                    {/* Header: Avatar + Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar
                          src={talent.avatarUrl || talent.avatar}
                          name={talent.fullName}
                          size="lg"
                          style={{
                            width: 54,
                            height: 54,
                            border: isMaster ? '2px solid #ec4899' : isPro ? '2px solid #6366f1' : '1px solid var(--border)',
                          }}
                        />
                        {isOnline ? (
                          <span
                            title="Đang trực tuyến"
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: 13,
                              height: 13,
                              borderRadius: '50%',
                              background: '#10b981',
                              border: '2px solid var(--surface)',
                              boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.4)',
                            }}
                          />
                        ) : (
                          <span
                            title="Ngoại tuyến"
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              background: '#9ca3af',
                              border: '2px solid var(--surface)',
                              opacity: 0.6,
                            }}
                          />
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <h3
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              margin: 0,
                              color: 'var(--ink)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 160,
                            }}
                            title={talent.fullName}
                          >
                            {talent.fullName}
                          </h3>
                        </div>

                        {/* User Tier Badge & Status Tag */}
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <UserTierBadge
                            planCode={talent.activePlanCode || 'FREE'}
                            userRole="student"
                            variant="pill"
                            size="sm"
                          />

                          {talent.isStudentVerified ? (
                            <span
                              title="Đã xác thực thẻ sinh viên và hồ sơ học tập hợp lệ"
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#059669',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                padding: '1px 6px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <span style={{ fontSize: 9 }}>✓</span> Đã xác thực SV
                            </span>
                          ) : (
                            <span
                              title="Hồ sơ tự khai báo, sinh viên chưa gửi đối soát thẻ sinh viên"
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: '#d97706',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                padding: '1px 6px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <span style={{ fontSize: 9 }}>ℹ</span> Chưa xác thực SV
                            </span>
                          )}

                          {isOnline ? (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 6 }}>
                              ● Online
                            </span>
                          ) : (
                            <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--ink-soft)', opacity: 0.75 }}>
                              Ngoại tuyến
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* School & Industry */}
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ opacity: 0.7 }}>🏛</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{talent.school || 'Đại học FPT'}</span>
                      </div>
                      {talent.industry && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ opacity: 0.7 }}>💼</span>
                          <span>{talent.industry}</span>
                        </div>
                      )}
                    </div>

                    {/* Score, Jobs & Expected Rate */}
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.03)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        marginBottom: 14,
                        fontSize: 12.5,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#f59e0b', fontWeight: 800 }}>★</span>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{talent.reliabilityScore}</span>
                          <span style={{ color: 'var(--ink-soft)', fontSize: 11 }}>Uy tín</span>
                        </div>

                        <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
                          Đã làm: <strong style={{ color: '#10b981' }}>{talent.jobsDoneCount} việc</strong>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Thù lao kỳ vọng:</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 13 }}>
                          {Number(talent.expectedRate || 120000).toLocaleString('vi-VN')}đ<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-soft)' }}>/giờ</span>
                        </span>
                      </div>
                    </div>

                    {/* Bio Snippet */}
                    <p
                      style={{
                        fontSize: 12.5,
                        color: 'var(--ink-soft)',
                        lineHeight: 1.5,
                        margin: '0 0 14px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: 38,
                      }}
                    >
                      {talent.companyDescription || 'Sinh viên năng động, trách nhiệm và cam kết tiến độ công việc trên SkillBridge.'}
                    </p>

                    {/* Skills Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                      {(talent.skills && talent.skills.length > 0 ? talent.skills : ['Canva', 'Content', 'Teamwork']).slice(0, 3).map((sk, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: '#4f46e5',
                          }}
                        >
                          {sk}
                        </span>
                      ))}
                      {talent.skills && talent.skills.length > 3 && (
                        <span style={{ fontSize: 11, color: 'var(--ink-soft)', alignSelf: 'center' }}>
                          +{talent.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/u/${slugify(talent.fullName)}`)}
                      className="btn btn-ghost"
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: 10,
                        border: '1.5px solid var(--border)',
                      }}
                    >
                      Xem hồ sơ
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenInvite(talent)}
                      className="btn btn-primary"
                      style={{
                        flex: 1.2,
                        padding: '9px 12px',
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: 10,
                        background: isMaster
                          ? 'linear-gradient(135deg, #ec4899, #8b5cf6)'
                          : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        border: 'none',
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
                      }}
                    >
                      Mời làm việc
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reusable Accessible Pagination */}
        {!loading && totalCount > 0 && (
          <div style={{ marginTop: 32 }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              pageSizeOptions={[12, 24, 36]}
              itemLabel="nhân tài"
            />
          </div>
        )}
      </div>

      {/* Modal Mời Nhận Việc Trực Tiếp */}
      {inviteModalOpen && selectedStudent && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !inviting) setInviteModalOpen(false);
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              maxWidth: 540,
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              animation: 'modalSlideUp 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <Avatar
                    src={selectedStudent.avatarUrl || selectedStudent.avatar}
                    name={selectedStudent.fullName}
                    size="md"
                    style={{ width: 44, height: 44 }}
                  />
                  {((state.onlineUserIds || []).includes(Number(selectedStudent.id)) || Boolean(selectedStudent.isOnline)) ? (
                    <span
                      title="Đang trực tuyến"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 11,
                        height: 11,
                        borderRadius: '50%',
                        background: '#10b981',
                        border: '2px solid var(--surface)',
                      }}
                    />
                  ) : (
                    <span
                      title="Ngoại tuyến"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#9ca3af',
                        border: '2px solid var(--surface)',
                        opacity: 0.6,
                      }}
                    />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                      Mời {selectedStudent.fullName} nhận việc
                    </h3>
                    {((state.onlineUserIds || []).includes(Number(selectedStudent.id)) || Boolean(selectedStudent.isOnline)) ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '1px 7px', borderRadius: 10 }}>
                        ● Online
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-soft)', background: 'rgba(0,0,0,0.05)', padding: '1px 7px', borderRadius: 10 }}>
                        Ngoại tuyến
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {selectedStudent.school || 'Đại học FPT'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                disabled={inviting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: 'var(--ink-soft)',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite}>
              {/* Job Selector */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                  Chọn dự án / công việc bạn muốn mời: <span style={{ color: '#ef4444' }}>*</span>
                </label>

                {loadingJobs ? (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '10px 0' }}>
                    Đang tải danh sách công việc của bạn...
                  </div>
                ) : employerJobs.length === 0 ? (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      color: '#dc2626',
                    }}
                  >
                    Bạn hiện chưa có công việc nào đang mở tuyển. Vui lòng đăng tin tuyển dụng trước khi gửi lời mời.
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setInviteModalOpen(false);
                          navigate('/employer/post-job');
                        }}
                        className="btn btn-primary"
                        style={{ fontSize: 12.5, padding: '6px 14px' }}
                      >
                        + Đăng tin mới ngay
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      fontSize: 13.5,
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                  >
                    {employerJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} {j.budget ? `— Ngân sách: ${Number(j.budget).toLocaleString('vi-VN')}đ` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message Textarea */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                  Lời nhắn gửi đến ứng viên:
                </label>
                <textarea
                  rows={4}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Nhập lời chào hoặc điểm nổi bật của dự án để thu hút ứng viên..."
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border)',
                    fontSize: 13.5,
                    lineHeight: 1.5,
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    resize: 'vertical',
                  }}
                />
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 5 }}>
                  Ứng viên sẽ nhận được thông báo tức thì kèm liên kết trực tiếp để ứng tuyển vào dự án.
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  disabled={inviting}
                  className="btn btn-ghost"
                  style={{ borderRadius: 10, padding: '10px 18px', border: '1px solid var(--border)' }}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={inviting || employerJobs.length === 0}
                  className="btn btn-primary"
                  style={{
                    borderRadius: 10,
                    padding: '10px 22px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    border: 'none',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  {inviting ? 'Đang gửi...' : 'Gửi lời mời ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
