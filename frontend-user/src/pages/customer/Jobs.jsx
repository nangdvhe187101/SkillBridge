import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import Pagination from '../../components/Pagination';
import { useStore, fmtVND } from '../../context/StoreContext';
import { adsPool } from '../../data/ads';
import { slugify } from '../../data/companies';

const CAT_ICON = {
  'Video Editing': 'film',
  'Graphic Design': 'brush',
  'Content Marketing': 'megaphone',
  'Data Entry': 'database',
  'Programming': 'file-text',
  'Translation': 'file-text',
  'Tutoring': 'graduation',
  'Photography': 'camera',
};

function formatDurationBadge(deadlineAt, postedAt) {
  if (!deadlineAt) return null;
  const start = postedAt ? new Date(postedAt).getTime() : Date.now();
  const end = new Date(deadlineAt).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return null;
  const totalHours = Math.max(1, Math.round(diffMs / 3600000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days} ngày ${hours}h`;
  if (days > 0) return `${days} ngày`;
  return `${hours} giờ`;
}

export default function Jobs() {
  const { state, submitOneTouchLead, toggleSaveJobAsync, refreshJobs } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [sort, setSort] = useState('new');
  const [statusTab, setStatusTab] = useState('open'); // 'open' | 'in_progress' | 'completed' | 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [adModal, setAdModal] = useState(null); // Ad object
  const [leadNote, setLeadNote] = useState('');
  const [submittedAd, setSubmittedAd] = useState(false);

  useEffect(() => {
    if (refreshJobs) {
      refreshJobs(statusTab === 'all' ? 'all' : statusTab);
    }
  }, [refreshJobs, statusTab]);

  const allJobs = state.jobs || [];
  const savedCount = (state.savedJobIds || []).length;

  // Thống kê số lượng theo trạng thái để hiển thị trên Tab
  const { openCount, inProgressCount, completedCount, allCount } = useMemo(() => {
    let openC = 0;
    let inProgressC = 0;
    let completedC = 0;
    let allC = 0;

    allJobs.forEach((j) => {
      if (j.status === 'cancelled') return;
      allC++;
      const isCompleted = j.status === 'completed';
      const isHiredOrInProgress = (j.status === 'in_progress' || j.status === 'filled' || j.status === 'submitted' || j.status === 'revision_requested' || Boolean(j.hiredApplicantId)) && !isCompleted;
      const isOpen = j.status === 'open' && !j.hiredApplicantId && !isCompleted;

      if (isOpen) openC++;
      else if (isHiredOrInProgress) inProgressC++;
      else if (isCompleted) completedC++;
    });

    return { openCount: openC, inProgressCount: inProgressC, completedCount: completedC, allCount: allC };
  }, [allJobs]);

  const handleStatusTabChange = (newTab) => {
    setStatusTab(newTab);
    setCurrentPage(1);
  };

  // Reset to page 1 on filter/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, q, sort]);

  // Build dynamic category list from actual job data
  const cats = useMemo(() => {
    const seen = new Set();
    allJobs.forEach((j) => { if (j.cat) seen.add(j.cat); });
    return [
      { cat: 'Tất cả', label: 'Tất cả', icon: null },
      { cat: 'saved', label: `Đã lưu (${savedCount})`, icon: 'heart' },
      ...[...seen].sort().map((cat) => ({ cat, label: cat, icon: CAT_ICON[cat] || null })),
    ];
  }, [allJobs, savedCount]);

  const list = useMemo(() => {
    let l = allJobs.filter((j) => {
      // 1. Phân định trạng thái chuẩn xác theo BR-01 & BR-02
      const isCompleted = j.status === 'completed';
      const isHiredOrInProgress = (j.status === 'in_progress' || j.status === 'filled' || j.status === 'submitted' || j.status === 'revision_requested' || Boolean(j.hiredApplicantId)) && !isCompleted;
      const isOpen = j.status === 'open' && !j.hiredApplicantId && !isCompleted;

      if (statusTab === 'open' && !isOpen) return false;
      if (statusTab === 'in_progress' && !isHiredOrInProgress) return false;
      if (statusTab === 'completed' && !isCompleted) return false;
      if (statusTab === 'all' && j.status === 'cancelled') return false;

      // 2. Lọc theo danh mục / Đã lưu
      if (filter === 'saved') {
        if (!(state.savedJobIds || []).includes(j.id)) return false;
      } else if (filter !== 'Tất cả' && j.cat !== filter) {
        return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (q) {
        const query = q.toLowerCase().trim();
        const match = (j.title && j.title.toLowerCase().includes(query)) ||
          (j.cat && j.cat.toLowerCase().includes(query)) ||
          (j.emp && j.emp.toLowerCase().includes(query));
        if (!match) return false;
      }

      return true;
    });

    if (sort === 'high') l = [...l].sort((a, b) => b.budget - a.budget);
    if (sort === 'low') l = [...l].sort((a, b) => a.budget - b.budget);
    return l;
  }, [allJobs, statusTab, filter, state.savedJobIds, q, sort]);

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
    const isJobSaved = (state.savedJobIds || []).includes(j.id);
    const isCompleted = j.status === 'completed';
    const isHiredOrInProgress = (j.status === 'in_progress' || j.status === 'filled' || j.status === 'submitted' || j.status === 'revision_requested' || Boolean(j.hiredApplicantId)) && !isCompleted;
    const isOpen = j.status === 'open' && !j.hiredApplicantId && !isCompleted;

    items.push(
      <div className="job-card" key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}>
        <div className="jc-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="jc-emp" onClick={(e) => { e.stopPropagation(); navigate(`/company/${slugify(j.emp)}`); }} style={{ cursor: 'pointer' }}>
            <Avatar src={j.employerAvatar || j.empAvatar} name={j.emp} className="jc-av" fontSize={13} />
            <div><b>{j.emp} <Icon name="check" style={{ width: 12, height: 12, display: 'inline' }} /></b><span>{j.loc}</span></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {j.urgent && <span className="chip chip-coral">Gấp</span>}
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await toggleSaveJobAsync(j.id);
                } catch (err) {
                  console.error('Lỗi lưu công việc:', err);
                }
              }}
              style={{
                border: 'none',
                background: isJobSaved ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0,0,0,0.04)',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.15s ease'
              }}
              title={isJobSaved ? 'Bỏ lưu khỏi danh sách yêu thích' : 'Lưu công việc vào yêu thích'}
            >
              <Icon name="heart" width="16" height="16" fill={isJobSaved ? '#ef4444' : 'none'} style={{ color: isJobSaved ? '#ef4444' : 'var(--ink-soft)' }} />
            </button>
          </div>
        </div>
        <h3>{j.title}</h3>
        <div className="jc-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Badge trạng thái rõ ràng */}
          {isCompleted && (
            <span
              className="chip"
              style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Công việc đã hoàn thành và nghiệm thu"
            >
              <Icon name="check" width="12" height="12" /> Đã hoàn thành
            </span>
          )}
          {isHiredOrInProgress && (
            <span
              className="chip"
              style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Đã có sinh viên nhận việc và đang triển khai"
            >
              <Icon name="lock" width="12" height="12" /> Đã có người nhận
            </span>
          )}
          {isOpen && (
            <span
              className="chip chip-lime"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title="Công việc đang mở tuyển ứng viên mới"
            >
              <Icon name="bolt" width="12" height="12" /> Đang tuyển
            </span>
          )}

          <span className="chip">{j.cat}</span>
          {(() => {
            const dur = formatDurationBadge(j.deadlineAt, j.postedAt);
            if (!dur) return null;
            return (
              <span className="chip" style={{ background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)', fontWeight: 600, fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="clock" width="12" height="12" /> {dur}
              </span>
            );
          })()}
          {(() => {
            const count = j.attachmentCount || (j.attachments ? j.attachments.length : 0);
            if (!count || count <= 0) return null;
            return (
              <span
                className="chip chip-lime"
                style={{ fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                title={`Công việc có kèm ${count} tệp tài liệu/đề bài`}
              >
                <Icon name="paperclip" width="12" height="12" /> {count} tệp đính kèm
              </span>
            );
          })()}
        </div>
        <div className="jc-foot"><span className="jc-price">{fmtVND(j.budget)}</span><span className="jc-time">{j.time}</span></div>
      </div>
    );
    if (filter === 'Tất cả' && !q && (i + 1) % 3 === 0 && i !== pagedList.length - 1) {
      const ad = adsPool[adCounter % adsPool.length];
      adCounter++;
      items.push(
        <div className="ad-card" key={'ad' + i} onClick={() => handleOpenAd(ad)}>
          <span className="ad-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="megaphone" width="12" height="12" /> Được tài trợ · {ad.sponsor || 'Quảng cáo Affiliate'}
          </span>
          <h3>{ad.title}</h3>
          <p>{ad.desc}</p>
          <div className="ad-cta">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="bolt" width="12" height="12" /> One-Touch Portfolio Generator
            </span>
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

          {/* Thanh chuyển tab Trạng thái việc làm (Status Filter Tabs) */}
          <div className="status-tabs-row" style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 4, overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { key: 'open', label: 'Đang mở tuyển', count: openCount, icon: 'bolt' },
              { key: 'in_progress', label: 'Đang thực hiện', count: inProgressCount, icon: 'lock' },
              { key: 'completed', label: 'Đã hoàn thành', count: completedCount, icon: 'check' },
              { key: 'all', label: 'Tất cả', count: allCount, icon: 'grid' },
            ].map((tab) => {
              const isActive = statusTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleStatusTabChange(tab.key)}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-subtle'}`}
                  style={{
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontWeight: isActive ? 600 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 2px 8px rgba(108, 76, 255, 0.25)' : 'none',
                    transition: 'all 0.18s ease',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name={tab.icon} width="13" height="13" />
                  <span>{tab.label}</span>
                  <span style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                    color: isActive ? '#fff' : 'var(--ink-soft)',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontSize: 11,
                    marginLeft: 2
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="filter-row">
            <div className="filter-chips">
              {cats.map((c) => (
                <button
                  key={c.cat}
                  className={'chip' + (filter === c.cat ? ' is-active' : '')}
                  onClick={() => setFilter(c.cat)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  {c.icon && <Icon name={c.icon} width="13" height="13" fill={c.icon === 'heart' ? 'currentColor' : 'none'} />}
                  <span>{c.label}</span>
                </button>
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
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Icon name="check" width="28" height="28" />
                </div>
                <h3 style={{ fontSize: 20, margin: '0 0 8px' }}>Đã gửi hồ sơ One-Touch thành công!</h3>
                <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  Hồ sơ xác thực trường của bạn đã được chuyển thẳng tới hòm thư của <b>{adModal.sponsor}</b>.<br />
                  Nhà tuyển dụng sẽ liên hệ và trao đổi chi tiết với bạn qua tin nhắn.
                </p>
                <span className="chip chip-lime" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" width="12" height="12" /> Đã cập nhật vào hệ thống
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
                  <div>
                    <span className="chip chip-coral" style={{ fontSize: 11, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="megaphone" width="12" height="12" /> Quảng cáo Tuyển dụng · {adModal.sponsor}
                    </span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="bolt" width="16" height="16" /> Ứng tuyển 1 chạm (One-Touch)
                    </h3>
                  </div>
                  <button onClick={() => setAdModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}>
                    <Icon name="x" width="16" height="16" />
                  </button>
                </div>

                <div style={{ background: 'rgba(108, 76, 255, 0.05)', border: '1px solid rgba(108, 76, 255, 0.2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <b style={{ color: 'var(--primary)', fontSize: 14, display: 'block', marginBottom: 4 }}>{adModal.title}</b>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.55 }}>{adModal.desc}</p>
                </div>

                {/* Authenticated Dossier Summary */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="file-text" width="14" height="14" /> Hồ sơ xác thực được trích xuất tự động:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span>Ứng viên: <b>{state.currentUser?.fullName || 'Minh Anh'}</b></span>
                    <span className="chip chip-lime" style={{ fontSize: 11 }}>Reliability: {state.myReliability || 96}/100</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="graduation" width="13" height="13" />
                    <span>Email trường: <code>{state.currentUser?.email || 'student.edu.vn'} (Đã xác thực)</code></span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    Kỹ năng sẵn sàng: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Canva, Video Editing, Content Marketing, English</span>
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
                  <button className="btn btn-primary btn-sm" onClick={handleConfirmOneTouch} style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="bolt" width="14" height="14" /> Xác nhận gửi hồ sơ 1 chạm
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

