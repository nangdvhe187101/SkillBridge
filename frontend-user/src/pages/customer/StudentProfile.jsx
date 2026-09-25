import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import ModalShell from '../../components/modals/ModalShell';
import UserTierBadge from '../../components/common/UserTierBadge';
import { useStore } from '../../context/StoreContext';
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
  const [selectedPf, setSelectedPf] = useState(null);

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
              <div className="ph-meta" style={{ marginTop: 8 }}>
                {skillsList.slice(0, 2).map((s, i) => (
                  <span className="chip" key={i} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>{s}</span>
                ))}
                <span className="chip chip-lime">{TIER_LABEL[tier]}</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
              <button className="btn btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.08)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
                onClick={() => openChatWithPerson(student.name)}>
                <Icon name="chat" style={{ width: 14, height: 14 }} /> Nhắn tin
              </button>
              <button className="btn btn-lime btn-sm" onClick={() => navigate('/jobs')}>Mời ứng tuyển</button>
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
    </div>
  );
}