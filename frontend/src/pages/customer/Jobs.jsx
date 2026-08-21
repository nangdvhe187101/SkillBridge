import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import Avatar from '../../components/Avatar';
import { useStore, fmtVND } from '../../context/StoreContext';
import { adsPool } from '../../data/ads';
import { slugify } from '../../data/companies';

const CATS = [
  { cat: 'Tất cả', label: 'Tất cả' },
  { cat: 'Video Editing', label: '🎬 Video Editing' },
  { cat: 'Graphic Design', label: '🎨 Graphic Design' },
  { cat: 'Content Marketing', label: '📣 Content Marketing' },
  { cat: 'Data Entry', label: '🗂️ Data Entry' },
];

export default function Jobs() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('Tất cả');
  const [sort, setSort] = useState('new');

  const list = useMemo(() => {
    let l = state.jobs.filter(
      (j) =>
        (j.status === 'open' || state.appliedJobIds.includes(j.id)) &&
        (filter === 'Tất cả' || j.cat === filter) &&
        (q === '' || j.title.toLowerCase().includes(q.toLowerCase().trim()))
    );
    if (sort === 'high') l = [...l].sort((a, b) => b.budget - a.budget);
    if (sort === 'low') l = [...l].sort((a, b) => a.budget - b.budget);
    return l;
  }, [state.jobs, state.appliedJobIds, filter, q, sort]);

  const items = [];
  let adCounter = 0;
  list.forEach((j, i) => {
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
        <div className="jc-tags"><span className="chip">{j.cat}</span></div>
        <div className="jc-foot"><span className="jc-price">{fmtVND(j.budget)}</span><span className="jc-time">{j.time}</span></div>
      </div>
    );
    if (filter === 'Tất cả' && !q && (i + 1) % 3 === 0 && i !== list.length - 1) {
      const ad = adsPool[adCounter % adsPool.length];
      adCounter++;
      items.push(
        <div className="ad-card" key={'ad' + i}
          onClick={() => alert(`Đây là bản demo — hồ sơ của bạn sẽ được tự động gửi tới ${ad.sponsor} qua One-Touch Portfolio Generator.`)}>
          <span className="ad-badge">📢 Được tài trợ · Quảng cáo Affiliate</span>
          <h3>{ad.title}</h3>
          <p>{ad.desc}</p>
          <div className="ad-cta"><span>Nhà tuyển dụng trả phí mỗi lượt click</span><span className="chip" style={{ background: 'transparent' }}>Xem chi tiết →</span></div>
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
              {CATS.map((c) => (
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
        </div>
      </div>
    </div>
  );
}
