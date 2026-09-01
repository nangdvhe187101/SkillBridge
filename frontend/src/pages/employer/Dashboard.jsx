import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import PostJobForm from '../../components/PostJobForm';
import { DonutChart, BarChart } from '../../components/DashboardCharts';
import DashboardSidebar, { DASHBOARD_TABS as TABS } from '../../components/DashboardSidebar';
import Pagination from '../../components/Pagination';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import '../../styles/account-settings.css';

const STATUS_LABEL = {
  open: 'Đang tuyển',
  filled: 'Đã đầy',
  in_progress: 'Đang thực hiện',
  submitted: 'Chờ xác nhận bàn giao',
  revision_requested: 'Đang chờ SV sửa lại',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const STATUS_COLOR = {
  open: '#CBFF4D',
  filled: '#6C4CFF',
  in_progress: '#57C7FF',
  submitted: '#FF5C7A',
  revision_requested: '#FF9E57',
  completed: '#4B2FD1',
  cancelled: '#A9A4CC',
};

const TIER_LABEL = { gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze' };
const TIER_COLOR = { gold: '#CBFF4D', silver: '#57C7FF', bronze: '#FF5C7A' };

function formatDeadline(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

function OverviewTab({ state, navigate, openModal, goToJobsTab, goToPostTab, goToAdsTab }) {
  const openCount = state.myJobs.filter((j) => j.status === 'open').length;
  const inProgressCount = state.myJobs.filter((j) => ['in_progress', 'submitted', 'revision_requested'].includes(j.status)).length;
  const totalApps = state.myJobs.reduce((s, j) => s + (j.applicants?.length || 0), 0);
  const paidOut = state.transactions.filter((t) => t.type === 'escrow_release').reduce((s, t) => s + t.amount, 0);
  const needsAttention = state.myJobs.filter((j) => j.status === 'submitted');

  const statusData = useMemo(() => {
    const counts = {};
    state.myJobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      label: STATUS_LABEL[status] || status,
      value,
      color: STATUS_COLOR[status] || '#888',
    }));
  }, [state.myJobs]);

  const topJobsData = useMemo(() => {
    return [...state.myJobs]
      .sort((a, b) => (b.applicants?.length || 0) - (a.applicants?.length || 0))
      .slice(0, 5)
      .map((j) => ({ label: j.title, value: j.applicants?.length || 0 }));
  }, [state.myJobs]);

  const tierData = useMemo(() => {
    const counts = { gold: 0, silver: 0, bronze: 0 };
    state.myJobs.forEach((j) => (j.applicants || []).forEach((a) => { if (counts[a.tier] !== undefined) counts[a.tier] += 1; }));
    return Object.entries(counts).map(([tier, value]) => ({
      label: TIER_LABEL[tier] || tier,
      value,
      color: TIER_COLOR[tier] || '#888',
    }));
  }, [state.myJobs]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="acct-content-title" style={{ margin: 0 }}>
          Tổng quan Nhà tuyển dụng
          {state.vipBusiness && <span className="chip chip-lime" style={{ verticalAlign: 'middle', marginLeft: 10 }}>👑 VIP Business Suite</span>}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-lime btn-sm" onClick={goToPostTab}>
            <Icon name="plus" style={{ width: 14, height: 14 }} /> Đăng tin tuyển dụng
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dash-stats" style={{ marginTop: 20 }}>
        <div className="dstat">
          <div style={{ fontSize: 22, marginBottom: 4 }}>📋</div>
          <b>{openCount}</b>
          <span>Tin đang tuyển</span>
        </div>
        <div className="dstat">
          <div style={{ fontSize: 22, marginBottom: 4 }}>⚙️</div>
          <b>{inProgressCount}</b>
          <span>Đang thực hiện</span>
        </div>
        <div className="dstat">
          <div style={{ fontSize: 22, marginBottom: 4 }}>👥</div>
          <b>{totalApps}</b>
          <span>Tổng hồ sơ ứng viên</span>
        </div>
        <div className="dstat">
          <div style={{ fontSize: 22, marginBottom: 4 }}>💰</div>
          <b>{fmtVND(paidOut)}</b>
          <span>Đã giải ngân qua Escrow</span>
        </div>
      </div>

      {/* High Priority: Needs Attention Section */}
      {needsAttention.length > 0 && (
        <div className="dash-panel" style={{ marginTop: 24, border: '1px solid var(--coral)' }}>
          <div className="dash-panel-head" style={{ background: 'rgba(255, 92, 122, 0.08)', borderRadius: '14px 14px 0 0' }}>
            <h4 style={{ color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏳</span> Cần xác nhận bàn giao ({needsAttention.length})
            </h4>
            <span className="chip chip-coral">Ưu tiên xử lý</span>
          </div>
          {needsAttention.map((j) => (
            <div
              className="dash-job-row"
              key={j.id}
              title="Bấm để xem sản phẩm bàn giao & giải ngân"
              onClick={() => openModal('deliverableReview', { jobId: j.id })}
              style={{ cursor: 'pointer' }}
            >
              <div className="djr-icon"><Icon name="briefcase" /></div>
              <div className="djr-main">
                <b>{j.title}</b>
                <span>Ứng viên <b>{j.hiredApplicant}</b> đã gửi sản phẩm bàn giao — Đang chờ bạn nghiệm thu.</span>
              </div>
              <span className={'djr-status ' + j.status}>{STATUS_LABEL[j.status]}</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => { e.stopPropagation(); openModal('deliverableReview', { jobId: j.id }); }}
              >
                Nghiệm thu ngay
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Triple-Zero Benefit Banner */}
      <div className="triple-zero" style={{ marginTop: 20 }}>
        <div className="tz-info">
          <h4>🎁 Ưu đãi "Triple-Zero" — Miễn phí 100% hoa hồng 3 tin đăng đầu tiên</h4>
          <p>
            {state.vipBusiness ? (
              <>Bạn đang là đối tác <b>VIP Business Suite</b> — phí nền tảng cố định <b>5%</b>/công việc cho mọi tin đăng trọn đời.</>
            ) : (
              <>Bạn đã sử dụng {state.triZeroUsed}/3 lượt đăng miễn phí. Từ tin thứ 4, phí nền tảng tiêu chuẩn là 10% (giảm còn 5% nếu nâng cấp gói Doanh nghiệp VIP).</>
            )}
          </p>
          <div className="tz-bar"><div className="tz-fill" style={{ width: `${Math.min(100, (state.triZeroUsed / 3) * 100)}%` }} /></div>
        </div>
        <div className="tz-count">{state.triZeroUsed}/3</div>
        {!state.vipBusiness && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>
            Nâng cấp VIP
          </button>
        )}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
        <button className="btn btn-outline btn-sm" onClick={goToJobsTab}>
          📋 Quản lý tất cả tin & ứng viên →
        </button>
        <button className="btn btn-outline btn-sm" onClick={goToAdsTab}>
          📢 Chiến dịch Affiliate CPC →
        </button>
      </div>

      {/* Charts / Analytics */}
      <div className="dash-analytics-grid" style={{ marginTop: 24 }}>
        <div className="dash-panel dash-panel-pad">
          <div className="dash-panel-head">
            <h4>Phân bố trạng thái tin đăng</h4>
          </div>
          {state.myJobs.length === 0 ? (
            <div className="empty-state">Chưa có dữ liệu tin đăng.</div>
          ) : (
            <DonutChart data={statusData} />
          )}
        </div>

        <div className="dash-panel dash-panel-pad">
          <div className="dash-panel-head">
            <h4>Top tin được quan tâm nhiều nhất</h4>
            {state.myJobs.length > 5 && (
              <button className="btn btn-outline btn-sm" onClick={goToJobsTab}>Xem tất cả</button>
            )}
          </div>
          {topJobsData.length === 0 ? (
            <div className="empty-state">Chưa có ứng viên ứng tuyển.</div>
          ) : (
            <BarChart data={topJobsData} valueSuffix=" ứng viên" />
          )}
        </div>

        <div className="dash-panel dash-panel-pad dash-analytics-span2">
          <div className="dash-panel-head">
            <h4>Phân cấp ứng viên ứng tuyển (Tiers)</h4>
          </div>
          {tierData.every((t) => t.value === 0) ? (
            <div className="empty-state">Chưa có dữ liệu phân cấp ứng viên.</div>
          ) : (
            <BarChart data={tierData} valueSuffix=" lượt ứng tuyển" />
          )}
        </div>
      </div>
    </>
  );
}

const PAGE_SIZE = 6;

function JobsTab({ state, navigate, openModal, goToPostTab }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [q, statusFilter, sortBy]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = state.myJobs.filter((j) => {
      const matchSearch = needle === '' || j.title.toLowerCase().includes(needle) || (j.cat && j.cat.toLowerCase().includes(needle));
      const matchStatus = statusFilter === 'all' || j.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => b.id - a.id);
    } else if (sortBy === 'applicants') {
      list = [...list].sort((a, b) => (b.applicants?.length || 0) - (a.applicants?.length || 0));
    } else if (sortBy === 'budget') {
      list = [...list].sort((a, b) => b.budget - a.budget);
    }
    return list;
  }, [state.myJobs, q, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="acct-content-title" style={{ margin: 0 }}>Quản lý tin tuyển dụng</h1>
        <button className="btn btn-lime btn-sm" onClick={goToPostTab}>
          <Icon name="plus" style={{ width: 14, height: 14 }} /> Đăng tin mới
        </button>
      </div>

      <div className="dash-panel" style={{ marginTop: 20 }}>
        <div className="dash-panel-head">
          <h4>
            Danh sách tin đăng
            {filtered.length > 0 && <span style={{ color: 'var(--ink-soft)', fontWeight: 400, marginLeft: 6 }}>({filtered.length})</span>}
          </h4>
        </div>

        {/* Toolbar Filter */}
        <div className="dash-toolbar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="dash-search" style={{ flex: 1, minWidth: 200 }}>
            <Icon name="search" />
            <input
              type="text"
              placeholder="Tìm theo tên công việc, lĩnh vực..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="dash-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className="dash-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Mới nhất</option>
            <option value="applicants">Nhiều ứng viên nhất</option>
            <option value="budget">Ngân sách cao nhất</option>
          </select>
        </div>

        {/* Job List */}
        {state.myJobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <b>Bạn chưa đăng tin tuyển dụng nào</b>
            <p style={{ color: 'var(--ink-soft)', marginTop: 4 }}>Hãy đăng tin đầu tiên để tiếp cận hàng ngàn sinh viên tài năng!</p>
            <button className="btn btn-lime btn-sm" style={{ marginTop: 14 }} onClick={goToPostTab}>
              + Đăng tin ngay
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 20px' }}>
            Không tìm thấy tin tuyển dụng nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          paged.map((j) => (
            <div
              className="dash-job-row"
              key={j.id}
              title="Bấm để xem danh sách ứng viên & quản lý công việc"
              onClick={() => navigate(`/dashboard/jobs/${j.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="djr-icon"><Icon name="briefcase" /></div>
              <div className="djr-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <b>{j.title}</b>
                  <span className="chip" style={{ fontSize: 11, padding: '1px 7px' }}>{j.cat}</span>
                  <span className="chip chip-lime" style={{ fontSize: 11, padding: '1px 7px' }}>{fmtVND(j.budget)}</span>
                  {j.urgent && <span className="chip chip-coral" style={{ fontSize: 11, padding: '1px 7px' }}>Gấp</span>}
                </div>
                <span style={{ marginTop: 4, display: 'block', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  {j.hiredApplicant ? <b style={{ color: '#6C4CFF' }}>Đã thuê: {j.hiredApplicant} · </b> : ''}
                  {['in_progress', 'submitted', 'revision_requested'].includes(j.status) && j.deadlineAt ? <b style={{ color: '#0284c7' }}>⏰ Hạn: {formatDeadline(j.deadlineAt)} · </b> : ''}
                  <span>Đăng ngày: <b style={{ color: 'var(--ink)' }}>{j.posted || 'gần đây'}</b></span>
                </span>
              </div>

              <span className={'djr-status ' + j.status}>{STATUS_LABEL[j.status] || j.status}</span>
              <span className="djr-apps" style={{ fontWeight: 600 }}>{j.applicants?.length || 0} ứng viên</span>

              {j.status === 'submitted' && (
                <button
                  className="btn btn-primary btn-sm"
                  title="Xem sản phẩm & xác nhận giải ngân"
                  onClick={(e) => { e.stopPropagation(); openModal('deliverableReview', { jobId: j.id }); }}
                >
                  Xem bàn giao
                </button>
              )}

              {j.status === 'open' && (
                <button
                  className="btn btn-outline btn-sm"
                  title="Xem danh sách ứng viên"
                  onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/jobs/${j.id}`); }}
                >
                  Xem ứng viên
                </button>
              )}

              <span className="djr-chev" aria-hidden="true"><Icon name="chevright" /></span>
            </div>
          ))
        )}

        {/* Reusable Pagination */}
        <div style={{ padding: '0 16px 16px' }}>
          <Pagination
            currentPage={pageSafe}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="tin tuyển dụng"
          />
        </div>
      </div>
    </>
  );
}

function AdsTab({ state, updateAdsSettings, openChatWithPerson }) {
  const settings = state.adsSettings || {
    adsOn: true,
    budget: 120000,
    audience: 'Sinh viên khối Kinh tế / Marketing',
    title: 'Tuyển Thực tập sinh Content & Video Creator (Remote)',
    desc: 'Làm việc linh hoạt theo thời gian rảnh, nhận trợ cấp 2.500.000đ/tháng + cấp chứng nhận thực tập chính quy.',
    sponsor: 'Trà Sữa Mộc F&B',
    ctaText: 'Ứng tuyển nhanh qua One-Touch Portfolio'
  };

  const [adsOn, setAdsOn] = useState(settings.adsOn);
  const [budget, setBudget] = useState(settings.budget);
  const [audience, setAudience] = useState(settings.audience);
  const [title, setTitle] = useState(settings.title || 'Tuyển Thực tập sinh Content & Video Creator (Remote)');
  const [desc, setDesc] = useState(settings.desc || 'Làm việc linh hoạt theo thời gian rảnh, nhận trợ cấp 2.500.000đ/tháng + cấp chứng nhận thực tập chính quy.');
  const [sponsor, setSponsor] = useState(settings.sponsor || 'Trà Sữa Mộc F&B');
  const [selectedLead, setSelectedLead] = useState(null);

  const clicksPerDay = useMemo(() => Math.max(0, Math.round(budget / 2400)), [budget]);
  const estimatedImpressions = clicksPerDay * 28;
  const spentToday = adsOn ? 115200 : 0;
  const clicksToday = adsOn ? 48 : 0;
  const leads = state.affiliateLeads || [];

  const handleSave = () => {
    updateAdsSettings({ adsOn, budget, audience, title, desc, sponsor });
    alert('Đã lưu và áp dụng cài đặt chiến dịch Quảng cáo Affiliate (CPC)!');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="acct-content-title" style={{ margin: 0 }}>Quảng cáo Affiliate (CPC) & One-Touch Leads</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            Tiếp cận đúng tệp sinh viên mục tiêu trên bảng tin Tìm việc — tự động thu thập hồ sơ đã xác thực trường.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="chip chip-lime">Enterprise Solution</span>
          <label className="switch" style={{ margin: 0 }}>
            <input type="checkbox" checked={adsOn} onChange={(e) => setAdsOn(e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>
      </div>

      {/* Real-time KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'block' }}>Lượt hiển thị (24h)</span>
          <b style={{ fontSize: 20, color: 'var(--primary)' }}>{adsOn ? estimatedImpressions.toLocaleString('vi-VN') : 0}</b>
          <span style={{ fontSize: 11, color: '#16a34a', display: 'block', marginTop: 2 }}>↑ 18.5% so với hôm qua</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'block' }}>Lượt click hợp lệ (CPC)</span>
          <b style={{ fontSize: 20, color: 'var(--ink)' }}>{clicksToday} / {clicksPerDay}</b>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block', marginTop: 2 }}>2.400đ / click</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'block' }}>Tỷ lệ tương tác (CTR)</span>
          <b style={{ fontSize: 20, color: '#0284c7' }}>{adsOn ? '3.75%' : '0%'}</b>
          <span style={{ fontSize: 11, color: '#16a34a', display: 'block', marginTop: 2 }}>Cao hơn trung bình sàn</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'block' }}>Hồ sơ One-Touch thu về</span>
          <b style={{ fontSize: 20, color: '#8b5cf6' }}>{leads.length} ứng viên</b>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block', marginTop: 2 }}>Đã gửi thẳng vào hòm thư</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'block' }}>Chi phí hôm nay / Hạn mức</span>
          <b style={{ fontSize: 20, color: '#e11d48' }}>{spentToday.toLocaleString('vi-VN')}đ</b>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block', marginTop: 2 }}>Ngân sách: {budget.toLocaleString('vi-VN')}đ</span>
        </div>
      </div>

      {/* Main Grid: Left Ad Studio & Budget | Right Live Preview & Leads Inbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Left Column: Creative Studio & Targeting */}
        <div>
          <div className="ads-panel" style={{ marginTop: 0 }}>
            <h4>🎨 Tùy biến Mẫu Banner Quảng cáo (Ad Creative Studio)</h4>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Banner này sẽ được hệ thống chèn xen kẽ tự nhiên vào danh sách tìm việc của sinh viên.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Tên nhà tài trợ / Doanh nghiệp:</label>
                <input
                  type="text"
                  value={sponsor}
                  onChange={(e) => setSponsor(e.target.value)}
                  placeholder="Ví dụ: Trà Sữa Mộc F&B"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Tiêu đề thông điệp tuyển dụng:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Tuyển Thực tập sinh Content & Video Creator"
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Mô tả ngắn gọn quyền lợi & cơ hội:</label>
                <textarea
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Mô tả công việc và quyền lợi hấp dẫn..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Ngân sách mỗi ngày (VND):</label>
                  <input
                    type="number"
                    step="10000"
                    min="24000"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>Đối tượng mục tiêu:</label>
                  <select value={audience} onChange={(e) => setAudience(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 }}>
                    <option>Sinh viên khối Kinh tế / Marketing</option>
                    <option>Sinh viên Digital Arts / Thiết kế đồ họa</option>
                    <option>Sinh viên Công nghệ thông tin / Lập trình</option>
                    <option>Toàn bộ sinh viên đã xác thực</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Anti-fraud banner */}
            <div style={{ marginTop: 16, padding: '10px 12px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: 10, border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: 12 }}>
              🛡️ <b>Hệ thống Anti-Fraud kích hoạt:</b> Tự động chặn IP ảo, bot crawler và click trùng lặp từ cùng 1 tài khoản trong 24h. Chỉ tính phí khi sinh viên mở xem hồ sơ.
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}>
                💾 Lưu & Kích hoạt chiến dịch
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Ad Preview & One-Touch Leads Inbox */}
        <div>
          {/* Live Ad Preview Card */}
          <div className="pcard" style={{ border: '1px solid var(--primary)', background: 'linear-gradient(to bottom, var(--surface), rgba(108, 76, 255, 0.03))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ margin: 0 }}>👁️ Xem trước Banner (Live Preview)</h4>
              <span className="chip chip-lime" style={{ fontSize: 10.5 }}>Hiển thị trên /jobs</span>
            </div>

            <div className="ad-card" style={{ margin: 0, cursor: 'pointer', border: '1px solid var(--border)' }}>
              <span className="ad-badge">📢 Được tài trợ · {sponsor || 'Doanh nghiệp'}</span>
              <h3 style={{ fontSize: 15, margin: '8px 0 4px' }}>{title || 'Tiêu đề quảng cáo'}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>
                {desc || 'Nội dung mô tả chiến dịch quảng cáo...'}
              </p>
              <div className="ad-cta" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Nhà tuyển dụng trả phí / click</span>
                <span className="chip chip-lime" style={{ fontSize: 11 }}>⚡ Ứng tuyển 1 chạm →</span>
              </div>
            </div>
          </div>

          {/* One-Touch Portfolio Leads Inbox */}
          <div className="pcard" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ margin: 0 }}>📥 Hồ sơ tự động thu về ({leads.length})</h4>
              <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>One-Touch Leads</span>
            </div>

            {leads.length === 0 ? (
              <div className="empty-state">Chưa có ứng viên bấm nộp hồ sơ từ quảng cáo.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--surface-card, rgba(0,0,0,0.02))',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 12.5
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          color: '#fff',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13
                        }}
                      >
                        {lead.avatar}
                      </div>
                      <div>
                        <b>{lead.name}</b> <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>⭐ {lead.reliability}/100</span>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{lead.school} · {lead.time}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => setSelectedLead(lead)}
                      >
                        Xem CV
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        onClick={() => openChatWithPerson && openChatWithPerson(lead.name, lead.school)}
                      >
                        💬 Chat
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead CV Detail Modal */}
      {selectedLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {selectedLead.avatar}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{selectedLead.name}</h3>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{selectedLead.school}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><b>Email trường đã xác thực:</b> <code>{selectedLead.email}</code></div>
              <div><b>Điểm uy tín (Reliability):</b> <span className="chip chip-lime" style={{ fontSize: 11 }}>{selectedLead.reliability} / 100</span></div>
              <div>
                <b>Kỹ năng nổi bật:</b>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {selectedLead.skills.map((s) => (
                    <span key={s} className="chip" style={{ fontSize: 11.5 }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 6, padding: 12, background: 'rgba(108, 76, 255, 0.06)', borderRadius: 10, border: '1px solid rgba(108, 76, 255, 0.15)' }}>
                💡 <b>Hồ sơ trích xuất tự động qua One-Touch:</b> Sinh viên này đã chủ động bấm vào banner quảng cáo của bạn và cho phép chia sẻ CV/Portfolio đã xác thực.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedLead(null)}>Đóng</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedLead(null);
                  if (openChatWithPerson) openChatWithPerson(selectedLead.name, selectedLead.school);
                }}
              >
                💬 Mở phòng chat tuyển dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Dashboard() {
  const { state, updateAdsSettings, openChatWithPerson, refreshMyJobs } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const validTabIds = TABS.map((t) => t.id);
  const [tab, setTab] = useState(validTabIds.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview');

  useEffect(() => {
    if (refreshMyJobs) refreshMyJobs();
  }, [refreshMyJobs]);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && validTabIds.includes(urlTab) && urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="page active">
      <div className="acct-settings-layout">
        <DashboardSidebar activeTab={tab} onTabClick={setTab} />

        <div className="acct-content">
          {tab === 'overview' && (
            <OverviewTab
              state={state}
              navigate={navigate}
              openModal={openModal}
              goToJobsTab={() => setTab('jobs')}
              goToPostTab={() => setTab('post')}
              goToAdsTab={() => setTab('ads')}
            />
          )}

          {tab === 'jobs' && (
            <JobsTab
              state={state}
              navigate={navigate}
              openModal={openModal}
              goToPostTab={() => setTab('post')}
            />
          )}

          {tab === 'post' && (
            <>
              <h1 className="acct-content-title">Đăng tin tuyển dụng mới</h1>
              <div style={{ marginTop: 20 }}>
                <PostJobForm onDone={() => setTab('jobs')} onCancelEdit={() => setTab('jobs')} />
              </div>
            </>
          )}

          {tab === 'ads' && (
            <AdsTab
              state={state}
              updateAdsSettings={updateAdsSettings}
              openChatWithPerson={openChatWithPerson}
            />
          )}
        </div>
      </div>
    </div>
  );
}