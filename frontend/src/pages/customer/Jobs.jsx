import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Pagination from '../../components/Pagination';
import { useStore, fmtVND } from '../../context/StoreContext';
import { adsPool } from '../../data/ads';
import { slugify } from '../../data/companies';

const CAT_ICON = {
  'Video Editing': '🎥',
  'Graphic Design': '🎨',
  'Content Marketing': '📣',
  'Data Entry': '🗎',
  'Programming': '💻',
  'Translation': '🌐',
  'Tutoring': '📚',
  'Photography': '📸',
};

export default function Jobs() {
  const { state, submitOneTouchLead } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [sort, setSort] = useState('new');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [adModal, setAdModal] = useState(null); // Ad object
  const [leadNote, setLeadNote] = useState('');
  const [submittedAd, setSubmittedAd] = useState(false);

  const allJobs = state.jobs;

  // Reset to page 1 on filter/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, q, sort]);

  // Build dynamic category list from actual job data
  const cats = useMemo(() => {
    const seen = new Set();
    allJobs.forEach((j) => { if (j.cat) seen.add(j.cat); });
    return [
      { cat: 'Tất cả', label: 'Tất cả' },
      ...[...seen].sort().map((cat) => ({ cat, label: (CAT_ICON[cat] || '📌') + ' ' + cat })),
    ];
  }, [allJobs]);

  const list = useMemo(() => {
    let l = allJobs.filter(
      (j) =>
        (j.status === 'open' || state.appliedJobIds.includes(j.id)) &&
        (filter === 'Tất cả' || j.cat === filter) &&
        (q === '' || j.title.toLowerCase().includes(q.toLowerCase().trim()) ||
          (j.cat && j.cat.toLowerCase().includes(q.toLowerCase().trim())) ||
          (j.emp && j.emp.toLowerCase().includes(q.toLowerCase().trim())))
    );
    if (sort === 'high') l = [...l].sort((a, b) => b.budget - a.budget);
    if (sort === 'low') l = [...l].sort((a, b) => a.budget - b.budget);
    return l;
  }, [allJobs, state.appliedJobIds, filter, q, sort]);

  const totalPages = Math.ceil(list.length / pageSize) || 1;
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, currentPage, pageSize]);

  const handleOpenAd = (ad) => {
    setAdModal(ad);
    setLeadNote('');
    setSubmittedAd(false);
  };

  const handleConfirmOneTouch = () => {
    if (!adModal) return;
    submitOneTouchLead({
      sponsor: adModal.sponsor,
      note: leadNote
    });
    setSubmittedAd(true);
    setTimeout(() => {
      setAdModal(null);
    }, 2000);
  };

  const items = [];
  let adCounter = (currentPage - 1);
  pagedList.forEach((j, i) => {
    items.push(
      <div className="job-card" key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}>
        <div className="jc-top">
          <div className="jc-emp" onClick={(e) => { e.stopPropagation(); navigate(`/company/${slugify(j.emp)}`); }} style={{ cursor: 'pointer' }}>
            <Avatar name={j.emp} className="jc-av" fontSize={13} />
            <div><b>{j.emp} <Icon name="check" style={{ width: 12, height: 12, display: 'inline' }} /></b><span>{j.loc}</span></div>
          </div>
          {j.urgent && <span className="chip chip-coral">Gấp</span>}
        </div>
        <h3>{j.title}</h3>
        <div className="jc-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="chip">{j.cat}</span>
          {j.attachments && j.attachments.length > 0 && (
            <span
              className="chip chip-lime"
              style={{ fontSize: 11, cursor: 'pointer' }}
              title={`Bấm vào chi tiết để tải ${j.attachments.length} tài liệu đính kèm`}
            >
              📎 {j.attachments.length} file đính kèm
            </span>
          )}
        </div>
        <div className="jc-foot"><span className="jc-price">{fmtVND(j.budget)}</span><span className="jc-time">{j.time}</span></div>
      </div>
    );
    if (filter === 'Tất cả' && !q && (i + 1) % 3 === 0 && i !== pagedList.length - 1) {
      const ad = adsPool[adCounter % adsPool.length];
      adCounter++;
      items.push(
        <div className="ad-card" key={'ad' + i} onClick={() => handleOpenAd(ad)}>
          <span className="ad-badge">📢 Được tài trợ · {ad.sponsor || 'Quảng cáo Affiliate'}</span>
          <h3>{ad.title}</h3>
          <p>{ad.desc}</p>
          <div className="ad-cta">
            <span>⚡ One-Touch Portfolio Generator</span>
            <span className="chip chip-lime" style={{ fontSize: 11 }}>Ứng tuyển 1 chạm →</span>
          </div>
        </div>
      );
    }
  });

  return (
    <div className="page active">
      <div className="jobs-head">
        <div className="wrap">
          <h1>Tìm việc phù hợp với bạn</h1>
          <p>Duyệt các micro-job đã được kiểm duyệt, cập nhật theo thời gian thực.</p>
          <div className="search-bar">
            <Icon name="search" />
            <input type="text" placeholder="Tìm theo tên công việc, ví dụ: dựng video TikTok..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary btn-sm">Tìm kiếm</button>
          </div>
          <div className="filter-row">
            <div className="filter-chips">
              {cats.map((c) => (
                <button key={c.cat} className={'chip' + (filter === c.cat ? ' is-active' : '')} onClick={() => setFilter(c.cat)}>{c.label}</button>
              ))}
            </div>
            <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="new">Mới nhất</option>
              <option value="high">Ngân sách cao nhất</option>
              <option value="low">Ngân sách thấp nhất</option>
            </select>
          </div>
        </div>
      </div>
      <div className="jobs-body">
        <div className="wrap">
          <div className="job-grid">
            {items.length === 0 ? <div className="empty-state">Không tìm thấy công việc phù hợp với bộ lọc hiện tại.</div> : items}
          </div>

          {/* Reusable Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={list.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 18, 24]}
            itemLabel="việc làm"
          />
        </div>
      </div>

      {/* One-Touch Portfolio Modal */}
      {adModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setAdModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 20,
              maxWidth: 500,
              width: '100%',
              padding: 26,
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {submittedAd ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 54, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontSize: 20, margin: '0 0 8px' }}>Đã gửi hồ sơ One-Touch thành công!</h3>
                <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  Hồ sơ xác thực trường của bạn đã được chuyển thẳng tới hòm thư của <b>{adModal.sponsor}</b>.<br />
                  Nhà tuyển dụng sẽ liên hệ và trao đổi chi tiết với bạn qua tin nhắn.
                </p>
                <span className="chip chip-lime" style={{ marginTop: 12, display: 'inline-block' }}>✓ Đã cập nhật vào hệ thống</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
                  <div>
                    <span className="chip chip-coral" style={{ fontSize: 11, marginBottom: 4, display: 'inline-block' }}>
                      📢 Quảng cáo Tuyển dụng · {adModal.sponsor}
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>⚡ Ứng tuyển 1 chạm (One-Touch)</h3>
                  </div>
                  <button onClick={() => setAdModal(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
                </div>

                <div style={{ background: 'rgba(108, 76, 255, 0.05)', border: '1px solid rgba(108, 76, 255, 0.2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <b style={{ color: 'var(--primary)', fontSize: 14, display: 'block', marginBottom: 4 }}>{adModal.title}</b>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.55 }}>{adModal.desc}</p>
                </div>

                {/* Authenticated Dossier Summary */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10 }}>
                    📄 Hồ sơ xác thực được trích xuất tự động:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span>Ứng viên: <b>{state.currentUser?.fullName || 'Minh Anh'}</b></span>
                    <span className="chip chip-lime" style={{ fontSize: 11 }}>Reliability: {state.myReliability || 96}/100</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    🎓 Email trường: <code>{state.currentUser?.email || 'student.edu.vn'} (✓ Đã xác thực)</code>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    🛠️ Kỹ năng sẵn sàng: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Canva, Video Editing, Content Marketing, English</span>
                  </div>
                </div>

                {/* Optional Message */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Lời chào / Giới thiệu ngắn (Tùy chọn):</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Em chào anh/chị, em có thể nhận việc và bắt đầu làm ngay ạ..."
                    value={leadNote}
                    onChange={(e) => setLeadNote(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setAdModal(null)}>Hủy</button>
                  <button className="btn btn-primary btn-sm" onClick={handleConfirmOneTouch} style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                    ⚡ Xác nhận gửi hồ sơ 1 chạm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

