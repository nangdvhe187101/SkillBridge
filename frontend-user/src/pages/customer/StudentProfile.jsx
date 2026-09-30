import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import ModalShell from '../../components/modals/ModalShell';
import UserTierBadge from '../../components/common/UserTierBadge';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { talentApi } from '../../api/talentApi';
import { getMyJobs } from '../../api/jobApi';
import { studentsSeed } from '../../data/studentDirectory';
import { slugify } from '../../data/companies';

function tierFromScore(score) {
  if (score >= 90) return 'gold';
  if (score >= 70) return 'silver';
  return 'bronze';
}
const TIER_LABEL = { gold: 'Gold Tier', silver: 'Silver Tier', bronze: 'Bronze Tier' };

export default function StudentProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state, openChatWithPerson } = useStore();
  const { showToast } = useToast();
  const [selectedPf, setSelectedPf] = useState(null);

  // Invite Talent State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [employerJobs, setEmployerJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const currentUser = state?.currentUser;
  const isSelf = currentUser && (
    slugify(currentUser.fullName || '') === slug ||
    slugify(state.displayName || '') === slug ||
    slug === 'dao-van-nang'
  );

  const matchedSeed = studentsSeed.find((s) => slugify(s.name) === slug);

  let formattedName = 'Sinh viên SkillBridge';
  if (slug === 'dao-van-nang') {
    formattedName = 'Đào Văn Năng';
  } else if (slug) {
    formattedName = slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  let student;
  if (isSelf) {
    student = {
      name: currentUser?.fullName || state?.displayName || 'Đào Văn Năng',
      school: currentUser?.schoolName || currentUser?.education || 'Đại học FPT Hà Nội',
      email: currentUser?.email || `${slug}@edu.vn`,
      phone: currentUser?.phoneNumber || '0327 724 169',
      reliability: currentUser?.reliabilityScore ?? state?.myReliability ?? 98,
      completedJobs: currentUser?.jobsDoneCount ?? (state?.myApplications?.filter((a) => a.status === 'completed')?.length || 8),
      avgRating: currentUser?.avgRating || 5.0,
      skills: (Array.isArray(currentUser?.skills) && currentUser?.skills.length > 0)
        ? currentUser.skills.map(s => typeof s === 'string' ? s : (s.skillName || s.name || 'Kỹ năng'))
        : ['Lập trình Fullstack Web', 'Thiết kế UI/UX Figma', 'Verified Canva Operator'],
      bio: currentUser?.bio || 'Sinh viên Đại học FPT, chuyên môn Lập trình Web và Thiết kế giao diện. Cam kết hoàn thành công việc đúng tiến độ với tinh thần trách nhiệm cao nhất trên nền tảng SkillBridge.',
      avatar: currentUser?.avatarUrl,
      portfolio: (Array.isArray(currentUser?.portfolios) && currentUser?.portfolios.length > 0)
        ? currentUser.portfolios.map(p => p.title || p)
        : ['Hệ thống Sàn giao dịch SkillBridge', 'Bộ ấn phẩm thiết kế thương hiệu FPT', 'Video sáng tạo nội dung ngắn'],
      planCode: currentUser?.planCode || state?.activePlanCode || 'STU_MASTER',
      reviews: currentUser?.reviews || [
        { name: 'Công ty Cổ phần Sáng Tạo FPT', stars: 5, comment: 'Sinh viên Đào Văn Năng làm việc rất có trách nhiệm, chủ động giao bài đúng hạn và sản phẩm đạt chất lượng cao.' },
        { name: 'Studio Thiết kế Alpha', stars: 5, comment: 'Kỹ năng chuyên môn tốt, phản hồi tin nhắn nhanh và tiếp thu góp ý rất cầu thị.' }
      ]
    };
  } else if (matchedSeed) {
    student = matchedSeed;
  } else {
    student = {
      name: formattedName,
      school: slug === 'dao-van-nang' ? 'Đại học FPT Hà Nội' : 'Đại học FPT / Bách Khoa',
      email: slug === 'dao-van-nang' ? 'nangdv@fpt.edu.vn' : `${slug || 'student'}@edu.vn`,
      phone: slug === 'dao-van-nang' ? '0327 724 169' : '0988 123 456',
      reliability: 98,
      completedJobs: 8,
      avgRating: 5.0,
      skills: ['Lập trình Fullstack Web', 'Thiết kế UI/UX Figma', 'Verified Canva Operator'],
      bio: 'Sinh viên năng động, cam kết hoàn thành công việc đúng tiến độ với tinh thần trách nhiệm cao nhất trên nền tảng SkillBridge.',
      portfolio: ['Hệ thống Sàn giao dịch SkillBridge', 'Bộ ấn phẩm thiết kế nhận diện thương hiệu', 'Website thương mại điện tử'],
      planCode: 'STU_MASTER',
      reviews: [
        { name: 'Doanh nghiệp Đối tác', stars: 5, comment: 'Sinh viên làm việc rất có trách nhiệm, giao bài đúng hạn và chất lượng sản phẩm tốt.' }
      ]
    };
  }

  const tier = tierFromScore(student.reliability || 95);
  const skillsList = student.skills || [];
  const portfolioList = student.portfolio || [];
  const reviewsList = student.reviews || [];
  const studentPlanCode = student.planCode || (student.reliability >= 95 ? 'STU_MASTER' : (student.reliability >= 85 ? 'STU_PRO' : 'STU_STARTER'));

  // Calculate expected rate
  const expectedRate = studentPlanCode === 'STU_MASTER'
    ? 400000
    : studentPlanCode === 'STU_PRO'
      ? 250000
      : studentPlanCode === 'STU_STARTER'
        ? 160000
        : (student.reliability >= 90 ? 200000 : (student.reliability >= 75 ? 150000 : 100000));
  const expectedRateFormatted = expectedRate.toLocaleString('vi-VN');

  // Open invite modal
  const handleOpenInvite = async () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập tài khoản Nhà tuyển dụng để mời nhận việc.', 'info');
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'employer') {
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

  // Submit invite
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      showToast('Vui lòng chọn một công việc bạn đang tuyển dụng.', 'warning');
      return;
    }

    try {
      setInviting(true);
      let targetId = student?.id || matchedSeed?.id;
      if (!targetId) {
        try {
          const resSearch = await talentApi.getTalents({ keyword: student.name, pageSize: 1 });
          const found = resSearch?.data?.items?.[0] || resSearch?.items?.[0];
          if (found?.id) {
            targetId = found.id;
          } else {
            targetId = 1;
          }
        } catch {
          targetId = 1;
        }
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

  return (
    <div className="page active">
      <div className="profile-hero">
        <div className="wrap">
          <a href="#" className="back-home" style={{ marginBottom: 14, display: 'inline-flex' }} onClick={(e) => { e.preventDefault(); navigate(-1); }}>
            <Icon name="chevleft" style={{ width: 14, height: 14 }} /> Quay lại
          </a>
          <div className="ph-row">
            <Avatar
              src={student.avatar || student.avatarUrl}
              name={student.name}
              fontSize={32}
              style={{ width: 88, height: 88, borderRadius: '22px' }}
            />
            <div>
              <div className="ph-name" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{student.name}</span>
                <UserTierBadge planCode={studentPlanCode} userRole="student" variant="pill" size="sm" />
                <div className={'stamp stamp-sm stamp-' + tier} title={`Xếp hạng: ${tier.toUpperCase()}`}><Icon name="check" /></div>
              </div>
              <div className="ph-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="graduation" width="15" height="15" />
                  <span>Sinh viên {student.school} · SkillBridge</span>
                </span>
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" width="11" height="11" />
                  <span>Đã xác thực eKYC Sinh viên</span>
                </span>
              </div>
              <div className="ph-meta" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {skillsList.slice(0, 3).map((s, i) => (
                  <span className="chip" key={i} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>{s}</span>
                ))}
                <span className="chip chip-lime">{TIER_LABEL[tier]}</span>
                <span
                  className="chip"
                  style={{
                    background: 'rgba(245, 158, 11, 0.22)',
                    color: '#fef08a',
                    borderColor: 'rgba(245, 158, 11, 0.45)',
                    fontWeight: 700,
                  }}
                  title="Mức thù lao mong muốn tham khảo của sinh viên"
                >
                  🏷️ Thù lao kỳ vọng: ~{expectedRateFormatted}đ/giờ
                </span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, position: 'relative', zIndex: 1, alignItems: 'center' }}>
              <button className="btn btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
                onClick={() => openChatWithPerson(student.name)}>
                <Icon name="chat" style={{ width: 14, height: 14 }} /> Nhắn tin
              </button>
              <button
                className="btn btn-lime btn-sm"
                style={{
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5
                }}
                onClick={handleOpenInvite}
              >
                <Icon name="briefcase" style={{ width: 14, height: 14 }} />
                Mời nhận việc
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap profile-body">
        <div className="pb-grid">
          <div>
            <div className="pcard">
              <h4>Giới thiệu</h4>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{student.bio}</p>
            </div>

            <div className="pcard">
              <h4>Điểm Reliability (Độ uy tín)</h4>
              <div className="score-wrap">
                <div className="score-num">{student.reliability} / 100</div>
                <div className="score-bar"><div className="score-fill" style={{ width: `${student.reliability}%` }} /></div>
              </div>
              <div className="score-note">Bắt đầu ở 100 điểm · trừ điểm nếu bỏ dở công việc</div>
            </div>

            <div className="pcard">
              <h4>Chỉ số năng lực</h4>
              <div className="stat-list">
                <div className="si"><b>{student.completedJobs}</b><span>Công việc hoàn thành</span></div>
                <div className="si">
                  <b style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {student.avgRating.toFixed(1)} <Icon name="star" width="12" height="12" style={{ color: '#eab308' }} />
                  </b>
                  <span>Đánh giá trung bình</span>
                </div>
                <div className="si"><b>99%</b><span>Giao đúng hạn</span></div>
                <div className="si"><b>&lt; 10p</b><span>Phản hồi tin nhắn</span></div>
              </div>
            </div>

            <div className="pcard">
              <h4>Huy hiệu kỹ năng</h4>
              {skillsList.length === 0 ? (
                <div className="empty-state">Chưa có huy hiệu kỹ năng nào.</div>
              ) : (
                <div className="badge-row">
                  {skillsList.map((b) => <span className="chip chip-dark" key={b}>{b}</span>)}
                </div>
              )}
            </div>
          </div>

          <div>
            {/* Employer View: Submitted CV Card */}
            <div className="pcard" style={{ border: '1px solid rgba(108, 76, 255, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="file-text" width="17" height="17" style={{ color: 'var(--primary)' }} />
                  <span>CV Ứng tuyển chuyên môn</span>
                </h4>
                <span className="chip chip-lime" style={{ fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" width="10" height="10" />
                  <span>Đã kiểm định</span>
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.5 }}>
                Bản CV phù hợp nhất do sinh viên chia sẻ trực tiếp với Nhà tuyển dụng.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--surface-2, rgba(0,0,0,0.02))',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  marginBottom: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="tx-ic" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="file-text" width="20" height="20" />
                  </div>
                  <div>
                    <b style={{ display: 'block', fontSize: 13.5 }}>CV_{student.name.replace(/\s+/g, '')}_ChuyenMon.pdf</b>
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                      Khối ngành: {skillsList[0] || 'Chuyên môn'} · 420 KB
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 12, padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    const blob = new Blob([`HỒ SƠ NĂNG LỰC / CV ỨNG TUYỂN\nSinh viên: ${student.name}\nTrường: ${student.school}\nKỹ năng: ${skillsList.join(', ')}\nReliability Score: ${student.reliability}/100\nĐược xác thực qua SkillBridge`], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `CV_${student.name.replace(/\s+/g, '')}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Icon name="download" width="13" height="13" />
                  <span>Tải CV</span>
                </button>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', background: 'var(--surface)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" width="13" height="13" style={{ flexShrink: 0, color: 'var(--primary)' }} />
                <span><b>Bảo vệ quyền riêng tư:</b> Các bản CV chuyên ngành khác của sinh viên được bảo mật và ẩn tự động đối với nhà tuyển dụng.</span>
              </div>
            </div>

            <div className="pcard">
              <h4>Portfolio & Dự án ({portfolioList.length})</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>Bấm vào từng dự án để xem chi tiết.</p>
              {portfolioList.length === 0 ? (
                <div className="empty-state">Sinh viên chưa thêm mục portfolio nào.</div>
              ) : (
                <div className="portfolio-grid">
                  {portfolioList.map((cap, i) => (
                    <div
                      className="pf-item"
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPf({ title: cap, desc: `Dự án thực tế do ${student.name} thực hiện và hoàn thành xuất sắc trên SkillBridge.` })}
                    >
                      <div
                        className="pf-thumb"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, rgba(108,76,255,0.18), rgba(87,199,255,0.18))',
                          borderRadius: 8
                        }}
                      >
                        <Icon name="brush" width="24" height="24" style={{ color: 'var(--primary)' }} />
                      </div>
                      <div className="pf-cap">{cap}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pcard">
              <h4>Đánh giá từ Nhà tuyển dụng ({reviewsList.length})</h4>
              {reviewsList.length === 0 ? (
                <div className="empty-state">Chưa có đánh giá nào.</div>
              ) : (
                reviewsList.map((r, i) => (
                  <div className="review-item" key={i}>
                    <div className="ri-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b>{r.author || r.name}</b>
                      <span className="stars" style={{ display: 'inline-flex', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Icon
                            key={idx}
                            name="star"
                            style={{
                              width: 13,
                              height: 13,
                              color: idx < r.stars ? '#eab308' : 'var(--border)'
                            }}
                          />
                        ))}
                      </span>
                    </div>
                    {r.job && <div className="ri-sub">{r.job}{r.time ? ` · ${r.time}` : ''}</div>}
                    <p>{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Lightbox Modal */}
      {selectedPf && (
        <ModalShell onClose={() => setSelectedPf(null)}>
          <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(108,76,255,0.15), rgba(87,199,255,0.15))', borderRadius: 12, marginBottom: 14 }}>
            <Icon name="brush" width="48" height="48" style={{ color: 'var(--primary)' }} />
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>{selectedPf.title}</h3>
          <span className="chip chip-lime" style={{ marginBottom: 10, display: 'inline-block' }}>Dự án đã kiểm định</span>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{selectedPf.desc}</p>
          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={() => setSelectedPf(null)}>Đóng</button>
          </div>
        </ModalShell>
      )}

      {/* Direct Invite Modal */}
      {inviteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 16,
              maxWidth: 520,
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 id="invite-modal-title" style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px', color: 'var(--ink)' }}>
                  Mời nhận việc trực tiếp
                </h3>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
                  Gửi lời mời tham gia dự án đến <b>{student.name}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: 'var(--ink-soft)',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendInvite}>
              {/* Job Select */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                  Chọn dự án / công việc đang tuyển:
                </label>
                {loadingJobs ? (
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '8px 0' }}>
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
                  Lời nhắn gửi đến sinh viên:
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
                  Sinh viên sẽ nhận được thông báo tức thì kèm liên kết ứng tuyển trực tiếp vào dự án.
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