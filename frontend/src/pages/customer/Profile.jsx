import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useConfirm } from '../../context/ConfirmContext';

function tierFromScore(score) {
  if (score >= 90) return 'gold';
  if (score >= 70) return 'silver';
  return 'bronze';
}
const TIER_LABEL = { gold: 'Gold Tier', silver: 'Silver Tier', bronze: 'Bronze Tier' };

const SKILL_BADGES = ['✓ Verified Canva Operator', '✓ CapCut Speed Editor', '✓ Content Writing'];
const SAMPLE_REVIEWS = [
  { name: 'Trà Sữa Mộc', stars: 5, comment: 'Bạn Minh Anh làm việc rất nhanh và đúng brief, chắc chắn sẽ thuê lại.' },
  { name: 'Cỏ May Agency', stars: 5, comment: 'Sản phẩm chỉn chu, giao trước deadline 1 ngày.' },
];
const SAMPLE_PORTFOLIO = [
  'TikTok Ads · Trà Sữa Mộc', 'Poster sự kiện trường', 'Reels sản phẩm mỹ phẩm',
  'Bộ slide pitch startup', 'Banner social Shopee', 'Video review quán ăn',
];

export default function Profile() {
  const { state, setCv, removeCv, addEmployerDocs, removeEmployerDoc, addPortfolio, removePortfolio } = useStore();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const cvInputRef = useRef();
  const docInputRef = useRef();
  const portfolioInputRef = useRef();

  const tier = tierFromScore(state.myReliability);
  const completedJobs = state.myApplications.filter((a) => a.status === 'completed').length;
  const receivedReviews = [...state.reviews, ...SAMPLE_REVIEWS];
  const avgStars = receivedReviews.length
    ? (receivedReviews.reduce((s, r) => s + r.stars, 0) / receivedReviews.length).toFixed(1)
    : '5.0';

  const onCvChange = (e) => {
    const f = e.target.files[0];
    if (f) setCv({ name: f.name, size: f.size });
    e.target.value = '';
  };
  const onDocsChange = (e) => {
    const files = Array.from(e.target.files).map((f) => ({ name: f.name, size: f.size }));
    if (files.length) addEmployerDocs(files);
    e.target.value = '';
  };
  const onPortfolioChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => addPortfolio({ name: f.name, dataUrl: reader.result });
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="page active">
      <div className="profile-hero">
        <div className="wrap">
          <div className="ph-row">
            <div className="ph-avatar" />
            <div>
              <div className="ph-name">
                {state.displayName}
                <div className={'stamp stamp-sm stamp-' + tier}><Icon name="check" /></div>
              </div>
              <div className="ph-sub">{state.role === 'employer' ? 'Nhà tuyển dụng · SkillBridge' : 'Sinh viên · SkillBridge'}</div>
              <div className="ph-meta">
                <span className="chip" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>🎬 Video Editing</span>
                <span className="chip" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>🎨 Graphic Design</span>
                <span className="chip chip-lime">{TIER_LABEL[tier]}</span>
                {state.subscriptionPro && (
                  <span className="chip" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.2)' }}>⭐ Freelance Pro</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap profile-body">
        <div className="pb-grid">
          <div>
            <div className="pcard">
              <h4>Điểm Reliability</h4>
              <div className="score-wrap">
                <div className="score-num">{state.myReliability}</div>
                <div className="score-bar"><div className="score-fill" style={{ width: `${state.myReliability}%` }} /></div>
              </div>
              <div className="score-note">Bắt đầu ở 100 điểm · trừ điểm nếu bỏ dở công việc</div>
            </div>

            <div className="pcard">
              <h4>Thống kê</h4>
              <div className="stat-list">
                <div className="si"><b>{completedJobs || 32}</b><span>Công việc hoàn thành</span></div>
                <div className="si"><b>{avgStars}★</b><span>Đánh giá trung bình</span></div>
                <div className="si"><b>98%</b><span>Đúng hạn</span></div>
                <div className="si"><b>~12p</b><span>Thời gian phản hồi</span></div>
              </div>
            </div>

            <div className="pcard">
              <h4>Huy hiệu kỹ năng</h4>
              <div className="badge-row">
                {SKILL_BADGES.map((b) => <span className="chip chip-dark" key={b}>{b}</span>)}
              </div>
            </div>

            <div className="pcard">
              <h4>Việc làm của bạn</h4>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginBottom: 14 }}>
                Đơn ứng tuyển và việc đang làm đã được chuyển sang trang riêng để dễ theo dõi.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/mywork')}>Mở Việc của tôi →</button>
            </div>

            <div className="pcard">
              <h4>Đánh giá của bạn về nhà tuyển dụng</h4>
              {state.employerReviews.length === 0 ? (
                <div className="empty-state">Bạn chưa đánh giá nhà tuyển dụng nào.</div>
              ) : (
                state.employerReviews.map((r, i) => (
                  <div className="review" key={i}>
                    <div className="rv-top"><b>{r.name}</b><span className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span></div>
                    <p>{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            {state.role !== 'employer' && (
              <div className="pcard">
                <h4>CV / Hồ sơ xin việc</h4>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.55 }}>
                  Tải lên CV để nhà tuyển dụng xem khi bạn ứng tuyển. Hỗ trợ PDF, DOC, DOCX hoặc ảnh.
                </p>
                <div className="upload-zone" onClick={() => cvInputRef.current.click()}>
                  <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx,image/*" onChange={onCvChange} />
                  <div className="uz-ic">📄</div>
                  <b>Kéo thả hoặc bấm để tải CV</b>
                  <span>Tối đa 5MB · lưu trên thiết bị (demo)</span>
                </div>
                {state.cvFile && (
                  <div className="file-chip-row">
                    <span className="chip">📄 {state.cvFile.name}
                      <button onClick={(e) => { e.stopPropagation(); removeCv(); }} style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                    </span>
                  </div>
                )}
              </div>
            )}

            {state.role === 'employer' && (
              <div className="pcard">
                <h4>Hồ sơ nhà tuyển dụng</h4>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.55 }}>
                  Tải GPKD, logo thương hiệu hoặc brochure công ty để tăng độ tin cậy khi đăng tin.
                </p>
                <div className="upload-zone" onClick={() => docInputRef.current.click()}>
                  <input ref={docInputRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={onDocsChange} />
                  <div className="uz-ic">🏢</div>
                  <b>Tải giấy tờ / logo / brochure</b>
                  <span>Có thể chọn nhiều file · PDF hoặc ảnh</span>
                </div>
                {state.employerDocs.length > 0 && (
                  <div className="file-chip-row">
                    {state.employerDocs.map((f, i) => (
                      <span className="chip" key={i}>📎 {f.name}
                        <button onClick={(e) => { e.stopPropagation(); removeEmployerDoc(i); }} style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pcard">
              <h4>Portfolio</h4>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.55 }}>
                Thêm mẫu việc đã làm — ảnh, PDF hoặc file minh họa kỹ năng.
              </p>
              <div className="upload-zone" style={{ marginBottom: 14 }} onClick={() => portfolioInputRef.current.click()}>
                <input ref={portfolioInputRef} type="file" accept="image/*,.pdf" onChange={onPortfolioChange} />
                <div className="uz-ic">🖼️</div>
                <b>Thêm mục portfolio</b>
                <span>Ảnh hoặc PDF · sẽ hiện trong lưới bên dưới</span>
              </div>
              <div className="portfolio-grid">
                {state.portfolioUploads.map((p, i) => (
                  <div className="pf-item" key={'u' + i} style={{ position: 'relative' }}>
                    <div className="pf-thumb" style={{ backgroundImage: `url(${p.dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <button
                      onClick={async () => { if (await confirm(`Xoá "${p.name}" khỏi portfolio?`, { danger: true, confirmLabel: 'Xoá' })) removePortfolio(i); }}
                      title="Xoá khỏi portfolio"
                      aria-label="Xoá khỏi portfolio"
                      style={{
                        position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
                        border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1,
                      }}
                    >✕</button>
                    <div className="pf-cap">{p.name}</div>
                  </div>
                ))}
                {SAMPLE_PORTFOLIO.map((cap, i) => (
                  <div className="pf-item" key={'s' + i}>
                    <div className="pf-thumb" />
                    <div className="pf-cap">{cap}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pcard">
              <h4>Đánh giá gần đây</h4>
              {state.reviews.map((r, i) => (
                <div className="review" key={'n' + i}>
                  <div className="rv-top"><b>{r.name}</b><span className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span></div>
                  <p>{r.comment}</p>
                </div>
              ))}
              {SAMPLE_REVIEWS.map((r, i) => (
                <div className="review" key={'s' + i}>
                  <div className="rv-top"><b>{r.name}</b><span className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</span></div>
                  <p>{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
