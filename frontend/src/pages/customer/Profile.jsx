import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ModalShell from '../../components/modals/ModalShell';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { downloadJobAttachment } from '../../utils/fileDownloader';

function tierFromScore(score) {
  if (score >= 90) return 'gold';
  if (score >= 70) return 'silver';
  return 'bronze';
}
const TIER_LABEL = { gold: 'Gold Tier', silver: 'Silver Tier', bronze: 'Bronze Tier' };

const SKILL_BADGES = ['✓ Verified Canva Operator', '✓ CapCut Speed Editor', '✓ Content Writing', '✓ Photoshop Advanced'];
const SAMPLE_REVIEWS = [
  { name: 'Trà Sữa Mộc', stars: 5, comment: 'Bạn Minh Anh làm việc rất nhanh và đúng brief, chắc chắn sẽ thuê lại.' },
  { name: 'Cỏ May Agency', stars: 5, comment: 'Sản phẩm chỉn chu, giao trước deadline 1 ngày.' },
];
const SAMPLE_PORTFOLIO = [
  { title: 'TikTok Ads · Trà Sữa Mộc', desc: 'Video ngắn 30s với hiệu ứng bắt trend, đạt 45.000 lượt xem.', icon: '🎬', tag: 'CapCut / Premiere' },
  { title: 'Poster sự kiện trường ĐH FPT', desc: 'Thiết kế khổ A1 phong cách Cyberpunk cho cuộc thi TechDay.', icon: '🎨', tag: 'Photoshop / Illustrator' },
  { title: 'Reels sản phẩm mỹ phẩm GlowUp', desc: 'Video review mỹ phẩm serum kết hợp voice over truyền cảm hứng.', icon: '💄', tag: 'Video Editing' },
  { title: 'Bộ slide pitch startup AI', desc: 'Slide 15 trang gọi vốn vòng Seed với biểu đồ tài chính trực quan.', icon: '📊', tag: 'Figma / Pitch' },
  { title: 'Banner social Shopee Super Sale', desc: 'Bộ 6 banner kích thước chuẩn cho gian hàng thương mại điện tử.', icon: '🛍️', tag: 'Canva / Design' },
  { title: 'Video review ẩm thực Đà Nẵng', desc: 'Review chuỗi quán cà phê vintage với gam màu film cổ điển.', icon: '☕', tag: 'Color Grading' },
];

export default function Profile() {
  const { state, setCv, removeCv, addCvFile, removeCvFile, addEmployerDocs, removeEmployerDoc, addPortfolio, removePortfolio } = useStore();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const cvInputRef = useRef();
  const docInputRef = useRef();
  const portfolioInputRef = useRef();
  const avatarInputRef = useRef();

  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatarUrl') || null);
  const [selectedPf, setSelectedPf] = useState(null);

  const tier = tierFromScore(state.myReliability);
  const completedJobs = state.myApplications.filter((a) => a.status === 'completed').length;
  const receivedReviews = [...state.reviews, ...SAMPLE_REVIEWS];
  const avgStars = receivedReviews.length
    ? (receivedReviews.reduce((s, r) => s + r.stars, 0) / receivedReviews.length).toFixed(1)
    : '5.0';

  const onAvatarChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result);
      localStorage.setItem('avatarUrl', reader.result);
      showToast('Đã cập nhật ảnh đại diện mới!', '📸');
    };
    reader.readAsDataURL(f);
  };

  const onCvChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      addCvFile({
        name: f.name,
        label: f.name.replace(/\.[^/.]+$/, ''),
        category: 'Lập trình web',
        size: f.size
      });
    }
    e.target.value = '';
  };

  const onDocsChange = (e) => {
    const files = Array.from(e.target.files).map((f) => ({ name: f.name, size: f.size }));
    if (files.length) {
      addEmployerDocs(files);
      showToast(`Đã thêm ${files.length} tài liệu doanh nghiệp.`, '🏢');
    }
    e.target.value = '';
  };

  const onPortfolioChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      addPortfolio({ name: f.name, dataUrl: reader.result, desc: 'Dự án tự tải lên từ thiết bị cá nhân.' });
      showToast(`Đã thêm dự án "${f.name}" vào Portfolio!`, '🎨');
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const currentName = state.currentUser?.fullName || state.displayName || (state.role === 'employer' ? 'Công ty TNHH Sáng Tạo' : 'Nguyễn Văn Năng');

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
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: '#fff',
              }}
              title="Bấm để đổi ảnh đại diện"
              onClick={() => avatarInputRef.current?.click()}
            >
              {!avatarUrl && currentName.charAt(0).toUpperCase()}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  border: '2px solid #fff',
                }}
              >
                📷
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarChange} />
            </div>

            <div>
              <div className="ph-name">
                {currentName}
                <div className={'stamp stamp-sm stamp-' + tier} title={`Xếp hạng: ${tier.toUpperCase()}`}><Icon name="check" /></div>
              </div>
              <div className="ph-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>{state.role === 'employer' ? '🏢 Nhà tuyển dụng · SkillBridge' : '🎓 Sinh viên ĐH FPT TP.HCM'}</span>
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px' }}>
                  ✓ Đã xác thực eKYC
                </span>
              </div>
              <div className="ph-meta" style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>🎬 Video Editing</span>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>🎨 Graphic Design</span>
                <span className="chip chip-lime">{TIER_LABEL[tier]}</span>
                {state.subscriptionPro && (
                  <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>⭐ Freelance Pro</span>
                )}
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
              <button className="btn btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
                onClick={() => navigate('/settings')}>
                ⚙️ Cài đặt hồ sơ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap profile-body">
        <div className="pb-grid">
          <div>
            {/* Reliability Score & In-Page Tier Roadmap Card */}
            <div className="pcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Điểm Reliability & Lộ trình Thăng Hạng</h4>
                <span className="chip chip-lime" style={{ fontSize: 11 }}>
                  {tier === 'gold' ? '🥇 Đang đạt Hạng Vàng' : (tier === 'silver' ? '🥈 Đang đạt Hạng Bạc' : '🥉 Hạng Đồng')}
                </span>
              </div>

              <div className="score-wrap">
                <div className="score-num">{state.myReliability} / 100</div>
                <div className="score-bar"><div className="score-fill" style={{ width: `${state.myReliability}%` }} /></div>
              </div>
              <div className="score-note" style={{ marginBottom: 16 }}>
                Bắt đầu ở 100 điểm · Giữ trên 90 điểm để duy trì quyền ưu tiên Gold Tier.
              </div>

              {/* 3-Tier Milestone Stepper */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14, background: 'var(--surface-2, rgba(0,0,0,0.02))', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10 }}>
                  🏆 3 Mốc Hạng Uy tín Nền tảng:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  {/* Bronze */}
                  <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#b45309' }}>
                      🥉 Đồng (Bronze)
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      • Dưới 85 điểm<br />
                      • Hạng khởi đầu cơ bản
                    </div>
                  </div>

                  {/* Silver */}
                  <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#64748b' }}>
                      🥈 Bạc (Silver)
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      • 85 – 94 điểm + ≥ 3 việc<br />
                      • Mở khóa Ứng tuyển 1 chạm
                    </div>
                  </div>

                  {/* Gold */}
                  <div style={{ padding: 10, borderRadius: 10, border: '1px solid #16a34a', background: 'rgba(34, 197, 94, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#16a34a' }}>
                      🥇 Vàng (Gold) ✓
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
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 8 }}>
                  ⚖️ Quy tắc Tự động Cộng / Trừ Điểm:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                  <div style={{ color: '#16a34a' }}>🟢 <b>+5 điểm:</b> Giao việc đúng hạn & 5★</div>
                  <div style={{ color: '#16a34a' }}>🟢 <b>+3 điểm:</b> Phản hồi & giải ngân nhanh</div>
                  <div style={{ color: '#e11d48' }}>🔴 <b>-10 điểm:</b> Trễ hạn không báo trước</div>
                  <div style={{ color: '#e11d48' }}>🔴 <b>-15 điểm:</b> Tự ý hủy / bỏ việc</div>
                </div>
              </div>
            </div>

            <div className="pcard">
              <h4>Chỉ số năng lực chuyên sâu</h4>
              <div className="stat-list">
                <div className="si"><b>{completedJobs || 32}</b><span>Công việc hoàn thành</span></div>
                <div className="si"><b>{avgStars}★</b><span>Đánh giá trung bình</span></div>
                <div className="si"><b>98.5%</b><span>Giao đúng hạn (On-time)</span></div>
                <div className="si"><b>&lt; 15p</b><span>Thời gian phản hồi</span></div>
              </div>
            </div>

            <div className="pcard">
              <h4>Huy hiệu kỹ năng đã kiểm định ({SKILL_BADGES.length})</h4>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 10 }}>
                Huy hiệu chứng nhận năng lực do Hệ thống & Nhà tuyển dụng đánh giá.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {SKILL_BADGES.map((b) => (
                  <div
                    key={b}
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
                  >
                    <span>{b}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pcard">
              <h4>Việc làm của bạn</h4>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 14 }}>
                Theo dõi tiến độ bàn giao sản phẩm và các đơn ứng tuyển đang hoạt động.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/mywork')}>Mở Việc của tôi →</button>
            </div>

            <div className="pcard">
              <h4>Đánh giá từ đối tác ({receivedReviews.length})</h4>
              {receivedReviews.map((r, i) => (
                <div className="review" key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="rv-top" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b>{r.name}</b>
                    <span className="stars" style={{ color: '#eab308' }}>{'★'.repeat(r.stars || 5)}</span>
                  </div>
                  <p style={{ fontSize: 13, marginTop: 4, color: 'var(--ink)' }}>{r.comment}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            {state.role !== 'employer' && (
              <div className="pcard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h4 style={{ margin: 0 }}>📁 Danh sách CV Chuyên môn ({(state.cvFiles || []).length})</h4>
                  <span className="chip chip-lime" style={{ fontSize: 10.5 }}>Đa lĩnh vực</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.5 }}>
                  Tải lên các bản CV theo từng chuyên môn để hệ thống tự động trích xuất đúng CV khi ứng tuyển.
                </p>

                {/* Multiple CVs List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {(state.cvFiles || []).map((cv) => (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 18 }}>📄</div>
                        <div>
                          <b style={{ display: 'block', fontSize: 13 }}>{cv.label || cv.name}</b>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                            <span className="chip" style={{ fontSize: 10, padding: '1px 6px' }}>{cv.category}</span>
                            <span>{cv.size}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '2px 8px' }}
                          onClick={() => downloadJobAttachment(cv, cv.label)}
                          title="Xem / Tải file CV"
                        >
                          Tải về
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm(`Xóa "${cv.label}" khỏi hồ sơ?`, { danger: true, confirmLabel: 'Xóa CV' })) {
                              removeCvFile(cv.id);
                            }
                          }}
                          style={{ border: 'none', background: 'none', color: 'var(--coral)', cursor: 'pointer', padding: '4px 6px', fontSize: 13 }}
                          title="Xóa CV"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="upload-zone" onClick={() => cvInputRef.current.click()}>
                  <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx,image/*" onChange={onCvChange} />
                  <div className="uz-ic">📄</div>
                  <b>+ Tải thêm bản CV chuyên môn mới</b>
                  <span>Hỗ trợ PDF, DOCX (Gắn theo từng ngành nghề)</span>
                </div>
              </div>
            )}

            {state.role === 'employer' && (
              <div className="pcard">
                <h4>Giấy tờ & Hồ sơ Doanh nghiệp</h4>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.55 }}>
                  Tải GPKD, logo hoặc brochure để nhận dấu tích xanh Doanh nghiệp đã xác thực.
                </p>
                <div className="upload-zone" onClick={() => docInputRef.current.click()}>
                  <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={onDocsChange} />
                  <div className="uz-ic">🏢</div>
                  <b>Tải giấy phép KD / Logo công ty</b>
                  <span>PDF hoặc Ảnh chụp rõ nét</span>
                </div>
                {state.employerDocs.length > 0 && (
                  <div className="file-chip-row" style={{ marginTop: 10 }}>
                    {state.employerDocs.map((f, i) => (
                      <span className="chip" key={i}>📎 {f.name}
                        <button onClick={(e) => { e.stopPropagation(); removeEmployerDoc(i); }} style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)' }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Portfolio Grid with Lightbox View */}
            <div className="pcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0 }}>Portfolio & Dự án mẫu ({SAMPLE_PORTFOLIO.length + state.portfolioUploads.length})</h4>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
                Bấm vào từng dự án để xem bản phóng to chi tiết hoặc tải thêm sản phẩm mới.
              </p>

              <div className="upload-zone" style={{ marginBottom: 14 }} onClick={() => portfolioInputRef.current.click()}>
                <input ref={portfolioInputRef} type="file" accept="image/*,.pdf" onChange={onPortfolioChange} />
                <div className="uz-ic">🖼️</div>
                <b>Thêm dự án mới vào Portfolio</b>
                <span>Ảnh chụp màn hình, mockup, file thiết kế...</span>
              </div>

              <div className="portfolio-grid">
                {/* Uploaded portfolio items */}
                {state.portfolioUploads.map((p, i) => (
                  <div
                    className="pf-item"
                    key={'u' + i}
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setSelectedPf({ title: p.name, desc: p.desc || 'Dự án đã tải lên', dataUrl: p.dataUrl, tag: 'Đã tải lên' })}
                  >
                    <div className="pf-thumb" style={{ backgroundImage: `url(${p.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <div className="pf-cap">{p.name}</div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await confirm(`Xoá "${p.name}" khỏi portfolio?`, { danger: true, confirmLabel: 'Xoá' })) removePortfolio(i);
                      }}
                      title="Xoá khỏi portfolio"
                      style={{
                        position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)',
                        color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Sample portfolio items */}
                {SAMPLE_PORTFOLIO.map((p, i) => (
                  <div
                    className="pf-item"
                    key={'s' + i}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedPf(p)}
                  >
                    <div
                      className="pf-thumb"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(108,76,255,0.18), rgba(87,199,255,0.18))',
                        fontSize: 28,
                      }}
                    >
                      {p.icon}
                    </div>
                    <div className="pf-cap">{p.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Lightbox Modal */}
      {selectedPf && (
        <ModalShell onClose={() => setSelectedPf(null)}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            {selectedPf.dataUrl ? (
              <img src={selectedPf.dataUrl} alt={selectedPf.title} style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 10, objectFit: 'contain' }} />
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(108,76,255,0.2), rgba(87,199,255,0.2))', borderRadius: 10, fontSize: 56 }}>
                {selectedPf.icon || '🎨'}
              </div>
            )}
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>{selectedPf.title}</h3>
          <span className="chip chip-lime" style={{ marginBottom: 10, display: 'inline-block' }}>{selectedPf.tag || 'Dự án mẫu'}</span>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{selectedPf.desc}</p>
          <div className="modal-actions" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={() => setSelectedPf(null)}>Đóng xem trước</button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
