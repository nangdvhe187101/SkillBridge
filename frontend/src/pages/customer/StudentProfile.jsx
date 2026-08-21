import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import ModalShell from '../../components/modals/ModalShell';
import { useModal } from '../../context/ModalContext';
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
  const { openModal } = useModal();
  const { openChatWithPerson } = useStore();
  const [selectedPf, setSelectedPf] = useState(null);

  const student = studentsSeed.find((s) => slugify(s.name) === slug);

  if (!student) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 10 }}>Không tìm thấy hồ sơ sinh viên này</h2>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Về Dashboard</button>
        </div>
      </div>
    );
  }

  const tier = tierFromScore(student.reliability);

  return (
    <div className="page active">
      <div className="profile-hero">
        <div className="wrap">
          <a href="#" className="back-home" style={{ marginBottom: 14, display: 'inline-flex' }} onClick={(e) => { e.preventDefault(); navigate(-1); }}>
            <Icon name="chevleft" style={{ width: 14, height: 14 }} /> Quay lại
          </a>
          <div className="ph-row">
            <div className="ph-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 32, color: '#fff' }}>
              {student.name.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="ph-name">
                {student.name}
                <div className={'stamp stamp-sm stamp-' + tier} title={`Xếp hạng: ${tier.toUpperCase()}`}><Icon name="check" /></div>
              </div>
              <div className="ph-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>🎓 Sinh viên {student.school} · SkillBridge</span>
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px' }}>
                  ✓ Đã xác thực eKYC Sinh viên
                </span>
              </div>
              <div className="ph-meta" style={{ marginTop: 8 }}>
                {student.skills.slice(0, 2).map((s, i) => (
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
                <div className="si"><b>{student.avgRating.toFixed(1)}★</b><span>Đánh giá trung bình</span></div>
                <div className="si"><b>99%</b><span>Giao đúng hạn</span></div>
                <div className="si"><b>&lt; 10p</b><span>Phản hồi tin nhắn</span></div>
              </div>
            </div>

            <div className="pcard">
              <h4>Huy hiệu kỹ năng</h4>
              {student.skills.length === 0 ? (
                <div className="empty-state">Chưa có huy hiệu kỹ năng nào.</div>
              ) : (
                <div className="badge-row">
                  {student.skills.map((b) => <span className="chip chip-dark" key={b}>{b}</span>)}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="pcard">
              <h4>Portfolio & Dự án ({student.portfolio.length})</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>Bấm vào từng dự án để xem chi tiết.</p>
              {student.portfolio.length === 0 ? (
                <div className="empty-state">Sinh viên chưa thêm mục portfolio nào.</div>
              ) : (
                <div className="portfolio-grid">
                  {student.portfolio.map((cap, i) => (
                    <div
                      className="pf-item"
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPf({ title: cap, desc: `Dự án thực tế do ${student.name} thực hiện và hoàn thành xuất sắc trên SkillBridge.`, icon: '🎨' })}
                    >
                      <div
                        className="pf-thumb"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, rgba(108,76,255,0.18), rgba(87,199,255,0.18))',
                          fontSize: 26,
                          borderRadius: 8
                        }}
                      >
                        🎨
                      </div>
                      <div className="pf-cap">{cap}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pcard">
              <h4>Đánh giá từ Nhà tuyển dụng ({student.reviews.length})</h4>
              {student.reviews.length === 0 ? (
                <div className="empty-state">Chưa có đánh giá nào.</div>
              ) : (
                student.reviews.map((r, i) => (
                  <div className="review" key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="rv-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b>{r.name}</b>
                      <span className="stars" style={{ color: '#eab308' }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span>
                    </div>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--ink)' }}>{r.comment}</p>
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
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(108,76,255,0.2), rgba(87,199,255,0.2))', borderRadius: 10, fontSize: 56, marginBottom: 14 }}>
            {selectedPf.icon || '🎨'}
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