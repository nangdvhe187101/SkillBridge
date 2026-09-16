import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import ModalShell from '../../components/modals/ModalShell';
import { useStore } from '../../context/StoreContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { downloadCandidateCv } from '../../utils/fileDownloader';
import { uploadAvatar } from '../../api/userApi';

function tierFromScore(score) {
  if (score >= 90) return 'gold';
  if (score >= 70) return 'silver';
  return 'bronze';
}
const TIER_LABEL = { gold: 'Gold Tier', silver: 'Silver Tier', bronze: 'Bronze Tier' };

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";

const SKILL_BADGES = ['Verified Canva Operator', 'CapCut Speed Editor', 'Content Writing', 'Photoshop Advanced'];
const SAMPLE_REVIEWS = [
  { name: 'Trà Sữa Mộc', stars: 5, comment: 'Bạn Minh Anh làm việc rất nhanh và đúng brief, chắc chắn sẽ thuê lại.' },
  { name: 'Cỏ May Agency', stars: 5, comment: 'Sản phẩm chỉn chu, giao trước deadline 1 ngày.' },
];
const SAMPLE_PORTFOLIO = [
  { title: 'TikTok Ads · Trà Sữa Mộc', desc: 'Video ngắn 30s với hiệu ứng bắt trend, đạt 45.000 lượt xem.', icon: 'video', tag: 'CapCut / Premiere' },
  { title: 'Poster sự kiện trường ĐH FPT', desc: 'Thiết kế khổ A1 phong cách Cyberpunk cho cuộc thi TechDay.', icon: 'image', tag: 'Photoshop / Illustrator' },
  { title: 'Reels sản phẩm mỹ phẩm GlowUp', desc: 'Video review mỹ phẩm serum kết hợp voice over truyền cảm hứng.', icon: 'video', tag: 'Video Editing' },
  { title: 'Bộ slide pitch startup AI', desc: 'Slide 15 trang gọi vốn vòng Seed với biểu đồ tài chính trực quan.', icon: 'chart-bar', tag: 'Figma / Pitch' },
  { title: 'Banner social Shopee Super Sale', desc: 'Bộ 6 banner kích thước chuẩn cho gian hàng thương mại điện tử.', icon: 'image', tag: 'Canva / Design' },
  { title: 'Video review ẩm thực Đà Nẵng', desc: 'Review chuỗi quán cà phê vintage với gam màu film cổ điển.', icon: 'video', tag: 'Color Grading' },
];

export default function Profile() {
  const { state, dispatch, addCvFile, removeCvFile, addEmployerDocs, removeEmployerDoc, addPortfolio, removePortfolio, updateProfile } = useStore();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const cvInputRef = useRef();
  const docInputRef = useRef();
  const portfolioInputRef = useRef();
  const avatarInputRef = useRef();

  const isEmployer = state.role === 'employer';
  const rawAvatarUrl = state.currentUser?.avatarUrl || null;
  const resolveAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_URL}/storage/file?key=${encodeURIComponent(url)}`;
  };
  const avatarUrl = resolveAvatarUrl(rawAvatarUrl);
  const [avatarError, setAvatarError] = useState(false);
  const [selectedPf, setSelectedPf] = useState(null);

  useEffect(() => {
    // Dọn dẹp key avatarUrl cũ không phân biệt tài khoản trong localStorage
    localStorage.removeItem('avatarUrl');
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  const tier = tierFromScore(state.myReliability);
  const completedJobs = state.myApplications.filter((a) => a.status === 'completed').length;
  const receivedReviews = [...state.reviews, ...SAMPLE_REVIEWS];
  const avgStars = receivedReviews.length
    ? (receivedReviews.reduce((s, r) => s + r.stars, 0) / receivedReviews.length).toFixed(1)
    : '5.0';

  const onAvatarChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      showToast('Đang tải lên ảnh đại diện...', 'hourglass');
      const res = await uploadAvatar(f);
      setAvatarError(false);
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
      showToast(`Đã thêm ${files.length} tài liệu doanh nghiệp.`, 'check');
    }
    e.target.value = '';
  };

  const onPortfolioChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      addPortfolio({ name: f.name, dataUrl: reader.result, desc: 'Dự án tự tải lên từ thiết bị cá nhân.' });
      showToast(`Đã thêm dự án "${f.name}" vào Portfolio!`, 'check');
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: '#fff',
                backgroundColor: isEmployer ? '#0284c7' : '#7c3aed',
                borderRadius: '22px',
                width: 88,
                height: 88,
                overflow: 'hidden',
                flexShrink: 0
              }}
              title="Bấm để đổi ảnh đại diện"
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={currentName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    if (!e.currentTarget.dataset.retried && rawAvatarUrl) {
                      e.currentTarget.dataset.retried = 'true';
                      const key = rawAvatarUrl.includes('avatars/')
                        ? rawAvatarUrl.substring(rawAvatarUrl.indexOf('avatars/'))
                        : rawAvatarUrl;
                      e.currentTarget.src = `${API_URL}/storage/file?key=${encodeURIComponent(key)}`;
                      return;
                    }
                    setAvatarError(true);
                  }}
                />
              ) : (
                <span>{currentName.charAt(0).toUpperCase()}</span>
              )}
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  background: 'var(--primary, #0ea5e9)',
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
              <div className="ph-name">
                {currentName}
                <div className={'stamp stamp-sm stamp-' + tier} title={`Xếp hạng: ${tier.toUpperCase()}`}><Icon name="check" /></div>
              </div>
              <div className="ph-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon name={state.role === 'employer' ? 'building' : 'graduation'} style={{ width: 14, height: 14 }} />
                  <span>{state.role === 'employer' ? 'Nhà tuyển dụng · SkillBridge' : 'Sinh viên ĐH FPT TP.HCM'}</span>
                </span>
                <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" style={{ width: 11, height: 11 }} />
                  <span>Đã xác thực eKYC</span>
                </span>
              </div>
              <div className="ph-meta" style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="video" style={{ width: 12, height: 12 }} />
                  <span>Video Editing</span>
                </span>
                <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="brush" style={{ width: 12, height: 12 }} />
                  <span>Graphic Design</span>
                </span>
                <span className="chip chip-lime">{TIER_LABEL[tier]}</span>
                {state.subscriptionPro && (
                  <span className="chip" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', borderColor: 'rgba(255,255,255,.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="zap" style={{ width: 12, height: 12, color: '#f59e0b' }} />
                    <span>Freelance Pro</span>
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
              <button className="btn btn-outline btn-sm" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderColor: 'rgba(255,255,255,.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate('/settings')}>
                <Icon name="settings" style={{ width: 14, height: 14 }} />
                <span>Cài đặt hồ sơ</span>
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
                <span className="chip chip-lime" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="award" style={{ width: 12, height: 12 }} />
                  <span>{tier === 'gold' ? 'Đang đạt Hạng Vàng' : (tier === 'silver' ? 'Đang đạt Hạng Bạc' : 'Hạng Đồng')}</span>
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
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                  <Icon name="award" style={{ width: 14, height: 14, color: 'var(--primary)', marginRight: 6 }} />
                  <span>3 Mốc Hạng Uy tín Nền tảng:</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                  {/* Bronze */}
                  <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#b45309' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#b45309' }} />
                      <span>Đồng (Bronze)</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      • Dưới 85 điểm<br />
                      • Hạng khởi đầu cơ bản
                    </div>
                  </div>

                  {/* Silver */}
                  <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#64748b' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#64748b' }} />
                      <span>Bạc (Silver)</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      • 85 – 94 điểm + ≥ 3 việc<br />
                      • Mở khóa Ứng tuyển 1 chạm
                    </div>
                  </div>

                  {/* Gold */}
                  <div style={{ padding: 10, borderRadius: 10, border: '1px solid #16a34a', background: 'rgba(34, 197, 94, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#16a34a' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                      <span>Vàng (Gold)</span>
                      <Icon name="check" style={{ width: 13, height: 13, marginLeft: 'auto' }} />
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
                  <span>Quy tắc Tự động Cộng / Trừ Điểm:</span>
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

            <div className="pcard">
              <h4>Chỉ số năng lực chuyên sâu</h4>
              <div className="stat-list">
                <div className="si"><b>{completedJobs || 32}</b><span>Công việc hoàn thành</span></div>
                <div className="si">
                  <b style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {avgStars}
                    <Icon name="star" style={{ width: 14, height: 14, color: '#eab308' }} />
                  </b>
                  <span>Đánh giá trung bình</span>
                </div>
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
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>
                      <Icon name="check" style={{ width: 12, height: 12, color: '#16a34a' }} />
                    </span>
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
                  <div className="rv-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b>{r.name}</b>
                    <span className="stars" style={{ display: 'inline-flex', gap: 2 }}>
                      {Array.from({ length: r.stars || 5 }).map((_, idx) => (
                        <Icon key={idx} name="star" style={{ width: 12, height: 12, color: '#eab308' }} />
                      ))}
                    </span>
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
                  <h4 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="folder" style={{ width: 16, height: 16, color: 'var(--primary)' }} />
                    <span>Danh sách CV Chuyên môn ({(state.cvFiles || []).length})</span>
                  </h4>
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)' }}>
                          <Icon name="file-text" style={{ width: 18, height: 18 }} />
                        </div>
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
                          onClick={() => downloadCandidateCv(cv.id, cv.name || cv.label)}
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
                          style={{ border: 'none', background: 'none', color: 'var(--coral)', cursor: 'pointer', padding: '4px 6px', display: 'inline-flex', alignItems: 'center' }}
                          title="Xóa CV"
                        >
                          <Icon name="x" style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="upload-zone" onClick={() => cvInputRef.current.click()}>
                  <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx,image/*" onChange={onCvChange} />
                  <div className="uz-ic" style={{ color: 'var(--primary)' }}>
                    <Icon name="file-text" style={{ width: 26, height: 26 }} />
                  </div>
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
                  <div className="uz-ic" style={{ color: 'var(--primary)' }}>
                    <Icon name="building" style={{ width: 26, height: 26 }} />
                  </div>
                  <b>Tải giấy phép KD / Logo công ty</b>
                  <span>PDF hoặc Ảnh chụp rõ nét</span>
                </div>
                {state.employerDocs.length > 0 && (
                  <div className="file-chip-row" style={{ marginTop: 10 }}>
                    {state.employerDocs.map((f, i) => (
                      <span className="chip" key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="paperclip" style={{ width: 12, height: 12 }} />
                        <span>{f.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); removeEmployerDoc(i); }} style={{ marginLeft: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)', display: 'inline-flex', alignItems: 'center' }}>
                          <Icon name="x" style={{ width: 12, height: 12 }} />
                        </button>
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
                <div className="uz-ic" style={{ color: 'var(--primary)' }}>
                  <Icon name="image" style={{ width: 26, height: 26 }} />
                </div>
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
                        color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Icon name="x" style={{ width: 12, height: 12 }} />
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
                      }}
                    >
                      <Icon name={p.icon || 'image'} style={{ width: 32, height: 32, color: 'var(--primary)' }} />
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
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(108,76,255,0.2), rgba(87,199,255,0.2))', borderRadius: 10 }}>
                <Icon name={selectedPf.icon || 'image'} style={{ width: 48, height: 48, color: 'var(--primary)' }} />
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
