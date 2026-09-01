import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { companiesSeed, getCompanyByName, slugify } from '../../data/companies';

const SAMPLE_COMPANY_REVIEWS = [
  { student: 'Minh Anh · ĐH FPT', rating: 5, time: '2 tuần trước', job: 'Dựng video TikTok 30s', comment: 'Doanh nghiệp duyệt bài nhanh, thanh toán đúng hạn và giao tiếp cực kỳ tôn trọng sinh viên.' },
  { student: 'Hải Đăng · ĐH Kiến Trúc', rating: 5, time: '1 tháng trước', job: 'Thiết kế poster tuyển sinh', comment: 'Brief rõ ràng, cung cấp đầy đủ tài liệu vector và hướng dẫn chu đáo.' },
  { student: 'Gia Hân · ĐH Kinh Tế', rating: 4.8, time: '1 tháng trước', job: 'Viết caption Instagram', comment: 'Trải nghiệm làm việc rất tốt, tiền ký quỹ được giải ngân ngay khi nghiệm thu.' },
];

export default function CompanyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [tab, setTab] = useState('overview'); // 'overview' | 'jobs' | 'reviews'
  const [following, setFollowing] = useState(false);

  const matchedJob = (state.jobs || []).find((j) => slugify(j.emp) === slug);
  const matchedEmpName = matchedJob ? matchedJob.emp : null;

  const entry = companiesSeed.find((c) => slugify(c.name) === slug) ||
    (matchedEmpName ? {
      name: matchedEmpName,
      website: matchedJob?.employerWebsite || null,
      taxCode: '0108899888 (Đã xác minh)',
      size: matchedJob?.employerCompanySize || '10-50 nhân viên',
      industry: matchedJob?.industry || matchedJob?.cat || 'Doanh nghiệp',
      address: matchedJob?.loc ? `${matchedJob.loc} · Đã xác minh` : 'Việt Nam',
      followers: 142,
      description: matchedJob?.companyDesc || `${matchedEmpName} là đơn vị tuyển dụng uy tín đã được xác thực trên nền tảng SkillBridge.`,
      longDescription: `${matchedEmpName} thường xuyên hợp tác cùng sinh viên và tài năng trẻ trên SkillBridge với cam kết thanh toán ký quỹ Escrow minh bạch và tôn trọng chất lượng công việc.`,
    } : (slug ? {
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      website: null,
      taxCode: '—',
      size: '10-50 nhân viên',
      industry: 'Tuyển dụng',
      address: 'Việt Nam',
      followers: 50,
      description: 'Nhà tuyển dụng đã xác thực danh tính trên SkillBridge.',
      longDescription: '',
    } : null));

  const company = entry;
  const jobs = useMemo(() => (state.jobs || []).filter((j) => slugify(j.emp) === slug || j.emp === company?.name), [state.jobs, company?.name, slug]);
  const openJobs = jobs.filter((j) => j.status === 'open');

  if (!company) {
    return (
      <div className="page active">
        <div className="wrap" style={{ padding: '100px 0', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 10 }}>Không tìm thấy nhà tuyển dụng này</h2>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>Hồ sơ có thể chưa được xác thực hoặc đường dẫn không đúng.</p>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')}>Về trang Tìm việc</button>
        </div>
      </div>
    );
  }

  const shareUrl = `https://skillbridge.vn/company/${slug}`;
  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => { });
    showToast('Đã sao chép đường dẫn hồ sơ doanh nghiệp!', '🔗');
  };

  return (
    <div className="page active">
      <div className="wrap" style={{ padding: '40px 0 90px' }}>
        <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate(-1); }}>
          <Icon name="chevleft" /> Quay lại
        </a>

        {/* Company Header */}
        <div className="cprofile-header">
          <div className="cprofile-logo">{company.name.trim().charAt(0).toUpperCase()}</div>
          <div className="cprofile-head-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>{company.name}</h1>
              <span className="chip chip-lime" style={{ fontSize: 11, padding: '3px 8px' }}>
                <Icon name="check" style={{ width: 12, height: 12, display: 'inline', marginRight: 4 }} />
                Doanh nghiệp đã xác minh eKYC
              </span>
            </div>
            <div className="cprofile-head-meta" style={{ marginTop: 8 }}>
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer">
                  <Icon name="link" style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />{company.website.replace('https://', '')}
                </a>
              )}
              <span><Icon name="users" style={{ width: 13, height: 13 }} /> {company.followers + (following ? 1 : 0)} người theo dõi</span>
              <span><Icon name="pin" style={{ width: 13, height: 13 }} /> {company.industry}</span>
              <span>⭐ 4.9/5.0 ({SAMPLE_COMPANY_REVIEWS.length} đánh giá)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => openChatWithPerson(company.name)}>
              <Icon name="chat" style={{ width: 14, height: 14 }} /> Nhắn tin
            </button>
            <button className={'btn btn-sm ' + (following ? 'btn-outline' : 'btn-primary')} onClick={() => setFollowing((f) => !f)}>
              {following ? '✓ Đang theo dõi' : '+ Theo dõi'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="cprofile-tabs">
          <button className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>Tổng quan</button>
          <button className={tab === 'jobs' ? 'is-active' : ''} onClick={() => setTab('jobs')}>Tin tuyển dụng ({jobs.length})</button>
          <button className={tab === 'reviews' ? 'is-active' : ''} onClick={() => setTab('reviews')}>Đánh giá từ Sinh viên ({SAMPLE_COMPANY_REVIEWS.length})</button>
        </div>

        <div className="cprofile-grid">
          <div>
            {tab === 'overview' && (
              <>
                <div className="pcard">
                  <h4>Giới thiệu công ty</h4>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 10 }}>{company.description}</p>
                  {company.longDescription && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{company.longDescription}</p>}
                </div>

                <div className="pcard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0 }}>Tin tuyển dụng đang mở ({openJobs.length})</h4>
                  </div>
                  {openJobs.length === 0 ? (
                    <div className="empty-state">Hiện chưa có tin tuyển dụng nào đang mở.</div>
                  ) : (
                    openJobs.slice(0, 5).map((j) => (
                      <div className="tx-row" style={{ cursor: 'pointer' }} key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}>
                        <div className="tx-ic">💼</div>
                        <div className="tx-main" style={{ flex: 1 }}>
                          <b>{j.title}</b>
                          <span>{j.cat} · {j.time}</span>
                        </div>
                        <b style={{ fontSize: 13, color: 'var(--primary-dark)' }}>{fmtVND(j.budget)}</b>
                      </div>
                    ))
                  )}
                  {openJobs.length > 5 && (
                    <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setTab('jobs')}>
                      Xem tất cả {jobs.length} tin →
                    </button>
                  )}
                </div>
              </>
            )}

            {tab === 'jobs' && (
              <div className="pcard">
                <h4>Tất cả tin tuyển dụng ({jobs.length})</h4>
                {jobs.length === 0 ? (
                  <div className="empty-state">Nhà tuyển dụng chưa đăng tin nào.</div>
                ) : (
                  jobs.map((j) => (
                    <div className="tx-row" style={{ cursor: 'pointer' }} key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}>
                      <div className="tx-ic">💼</div>
                      <div className="tx-main" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <b>{j.title}</b>
                          {j.urgent && <span className="chip chip-coral" style={{ padding: '2px 8px', fontSize: 10 }}>Gấp</span>}
                          {j.attachments?.length > 0 && <span className="chip chip-lime" style={{ fontSize: 10, padding: '1px 6px' }}>📎 Có brief</span>}
                        </div>
                        <span>{j.cat} · {j.time}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>{fmtVND(j.budget)}</div>
                        <span className={'djr-status ' + (j.status === 'open' ? 'open' : 'filled')} style={{ display: 'inline-block', marginTop: 4 }}>
                          {j.status === 'open' ? 'Đang tuyển' : 'Đã đầy'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <div className="pcard">
                <h4>Đánh giá từ sinh viên đã nhận việc ({SAMPLE_COMPANY_REVIEWS.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
                  {SAMPLE_COMPANY_REVIEWS.map((r, i) => (
                    <div key={i} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b>{r.student}</b>
                        <span style={{ color: '#eab308', fontWeight: 600 }}>{'★'.repeat(Math.floor(r.rating))} {r.rating}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '2px 0 6px' }}>
                        Dự án: <b>{r.job}</b> · {r.time}
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="pcard">
              <h4>Chỉ số bảo chứng uy tín</h4>
              <div className="info-row">
                <div className="info-ic" style={{ color: '#16a34a' }}>💰</div>
                <div>
                  <div className="info-lbl">Tỷ lệ giải ngân Escrow</div>
                  <div className="info-val" style={{ color: '#16a34a', fontWeight: 700 }}>100% (An toàn tuyệt đối)</div>
                </div>
              </div>
              <div className="info-row">
                <div className="info-ic">⚡</div>
                <div>
                  <div className="info-lbl">Thời gian phản hồi SV</div>
                  <div className="info-val">&lt; 15 phút</div>
                </div>
              </div>
              <div className="info-row">
                <div className="info-ic"><Icon name="check" /></div>
                <div><div className="info-lbl">Mã số thuế</div><div className="info-val">{company.taxCode}</div></div>
              </div>
              <div className="info-row">
                <div className="info-ic"><Icon name="users" /></div>
                <div><div className="info-lbl">Quy mô doanh nghiệp</div><div className="info-val">{company.size}</div></div>
              </div>
            </div>

            <div className="pcard">
              <h4>Địa điểm công ty</h4>
              <div className="info-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                <div className="info-ic"><Icon name="pin" /></div>
                <div className="info-val" style={{ fontWeight: 500, lineHeight: 1.5 }}>{company.address}</div>
              </div>
              <div className="cprofile-map-ph">
                <Icon name="pin" style={{ width: 16, height: 16 }} /> TP.HCM · Đã xác minh địa điểm
              </div>
            </div>

            <div className="pcard">
              <h4>Chia sẻ hồ sơ</h4>
              <div className="cshare-row">
                <input type="text" readOnly value={shareUrl} style={{ fontSize: 12 }} />
                <button className="btn btn-outline btn-sm" onClick={copyLink}>Sao chép</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}