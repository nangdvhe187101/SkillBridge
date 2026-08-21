import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { companiesSeed, getCompanyByName, slugify } from '../../data/companies';

export default function CompanyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { state, openChatWithPerson } = useStore();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const [tab, setTab] = useState('overview');
  const [following, setFollowing] = useState(false);

  const entry = companiesSeed.find((c) => slugify(c.name) === slug);
  const company = entry || getCompanyByName(null);
  const jobs = useMemo(() => state.jobs.filter((j) => j.emp === company.name), [state.jobs, company.name]);
  const openJobs = jobs.filter((j) => j.status === 'open');

  if (!entry) {
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
    showToast('Đã sao chép đường dẫn hồ sơ.', '🔗');
  };

  return (
    <div className="page active">
      <div className="wrap" style={{ padding: '40px 0 90px' }}>
        <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); navigate(-1); }}>
          <Icon name="chevleft" /> Quay lại
        </a>

        <div className="cprofile-header">
          <div className="cprofile-logo">{company.name.trim().charAt(0).toUpperCase()}</div>
          <div className="cprofile-head-main">
            <h1>{company.name} <Icon name="check" style={{ width: 16, height: 16, display: 'inline', color: 'var(--primary)', verticalAlign: 'middle' }} /></h1>
            <div className="cprofile-head-meta">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer">
                  <Icon name="link" style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />{company.website.replace('https://', '')}
                </a>
              )}
              <span><Icon name="users" style={{ width: 13, height: 13 }} /> {company.followers + (following ? 1 : 0)} người theo dõi</span>
              <span><Icon name="pin" style={{ width: 13, height: 13 }} /> {company.industry}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => openChatWithPerson(company.name)}>
              <Icon name="chat" style={{ width: 14, height: 14 }} /> Nhắn tin
            </button>
            <button className={'btn btn-sm ' + (following ? 'btn-outline' : 'btn-primary')} onClick={() => setFollowing((f) => !f)}>
              {following ? '✓ Đang theo dõi' : '+ Theo dõi'}
            </button>
          </div>
        </div>

        <div className="cprofile-tabs">
          <button className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>Tổng quan</button>
          <button className={tab === 'jobs' ? 'is-active' : ''} onClick={() => setTab('jobs')}>Tin tuyển dụng ({jobs.length})</button>
        </div>

        <div className="cprofile-grid">
          <div>
            {tab === 'overview' ? (
              <>
                <div className="pcard">
                  <h4>Giới thiệu công ty</h4>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7, marginBottom: 10 }}>{company.description}</p>
                  {company.longDescription && <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{company.longDescription}</p>}
                </div>
                <div className="pcard">
                  <h4>Tin tuyển dụng đang mở ({openJobs.length})</h4>
                  {openJobs.length === 0 ? (
                    <div className="empty-state">Hiện chưa có tin tuyển dụng nào đang mở.</div>
                  ) : (
                    openJobs.slice(0, 5).map((j) => (
                      <div className="tx-row" style={{ cursor: 'pointer' }} key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}>
                        <div className="tx-ic">💼</div>
                        <div className="tx-main" style={{ flex: 1 }}><b>{j.title}</b><span>{j.cat} · {j.time}</span></div>
                        <b style={{ fontSize: 13, color: 'var(--primary-dark)' }}>{fmtVND(j.budget)}</b>
                      </div>
                    ))
                  )}
                  {openJobs.length > 5 && (
                    <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setTab('jobs')}>Xem tất cả {jobs.length} tin →</button>
                  )}
                </div>
              </>
            ) : (
              <div className="pcard">
                <h4>Tất cả tin tuyển dụng ({jobs.length})</h4>
                {jobs.length === 0 ? (
                  <div className="empty-state">Nhà tuyển dụng chưa đăng tin nào.</div>
                ) : (
                  jobs.map((j) => (
                    <div className="tx-row" style={{ cursor: 'pointer' }} key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}>
                      <div className="tx-ic">💼</div>
                      <div className="tx-main" style={{ flex: 1 }}>
                        <b>{j.title}{j.urgent && <span className="chip chip-coral" style={{ marginLeft: 8, padding: '2px 8px', fontSize: 10 }}>Gấp</span>}</b>
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
          </div>

          <div>
            <div className="pcard">
              <h4>Thông tin chung</h4>
              <div className="info-row">
                <div className="info-ic"><Icon name="check" /></div>
                <div><div className="info-lbl">Mã số thuế</div><div className="info-val">{company.taxCode}</div></div>
              </div>
              <div className="info-row">
                <div className="info-ic"><Icon name="users" /></div>
                <div><div className="info-lbl">Quy mô</div><div className="info-val">{company.size}</div></div>
              </div>
              <div className="info-row">
                <div className="info-ic"><Icon name="briefcase" /></div>
                <div><div className="info-lbl">Lĩnh vực hoạt động</div><div className="info-val">{company.industry}</div></div>
              </div>
            </div>

            <div className="pcard">
              <h4>Địa điểm công ty</h4>
              <div className="info-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                <div className="info-ic"><Icon name="pin" /></div>
                <div className="info-val" style={{ fontWeight: 500, lineHeight: 1.5 }}>{company.address}</div>
              </div>
              <div className="cprofile-map-ph">
                <Icon name="pin" style={{ width: 16, height: 16 }} /> Bản đồ minh hoạ (demo)
              </div>
            </div>

            <div className="pcard">
              <h4>Chia sẻ hồ sơ</h4>
              <div className="cshare-row">
                <div className="cshare-copy"><span>{shareUrl}</span></div>
                <button className="btn btn-outline btn-sm" onClick={copyLink}><Icon name="copy" style={{ width: 14, height: 14 }} /></button>
              </div>
              <div className="cshare-social">
                <a href="#" onClick={(e) => e.preventDefault()} aria-label="Chia sẻ Facebook"><Icon name="fb" style={{ width: 16, height: 16 }} /></a>
                <a href="#" onClick={(e) => e.preventDefault()} aria-label="Chia sẻ X"><Icon name="x" style={{ width: 16, height: 16 }} /></a>
                <a href="#" onClick={(e) => e.preventDefault()} aria-label="Chia sẻ LinkedIn"><Icon name="linkedin" style={{ width: 16, height: 16 }} /></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}