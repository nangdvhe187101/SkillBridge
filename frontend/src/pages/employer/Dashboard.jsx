import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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

import Avatar from '../../components/Avatar';
import { useConfirm } from '../../context/ConfirmContext';

function OverviewTab({ state, navigate, openModal, goToJobsTab, goToPostTab, goToAdsTab }) {
  const { openChatWithPerson } = useStore();
  const companyName = state.user?.companyName || state.user?.fullName || 'Nhà tuyển dụng';
  const openCount = state.myJobs.filter((j) => j.status === 'open').length;
  const inProgressCount = state.myJobs.filter((j) => ['in_progress', 'submitted', 'revision_requested'].includes(j.status)).length;
  const totalApps = state.myJobs.reduce((s, j) => s + (j.applicantsCount ?? j.applicants?.length ?? 0), 0);
  const paidOut = state.transactions.filter((t) => t.type === 'escrow_release').reduce((s, t) => s + t.amount, 0);
  const needsAttention = state.myJobs.filter((j) => j.status === 'submitted');

  // Aggregate recent applicants across all employer jobs
  const recentApplicants = useMemo(() => {
    const list = [];
    state.myJobs.forEach((j) => {
      (j.applicants || []).forEach((a) => {
        list.push({
          ...a,
          jobId: j.id,
          jobTitle: j.title,
          jobBudget: j.budget,
        });
      });
    });
    return list.slice(0, 4);
  }, [state.myJobs]);

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
      {/* Hero Welcome Banner with Glow and Gradient */}
      <div
        style={{
          background: 'linear-gradient(135deg, #181528 0%, #241c47 50%, #3b2885 100%)',
          color: '#fff',
          borderRadius: 16,
          padding: '26px 30px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(59, 40, 133, 0.25)',
          marginBottom: 24,
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 99, fontWeight: 600, letterSpacing: 0.5 }}>
                🏢 DOANH NGHIỆP TUYỂN DỤNG
              </span>
              {state.vipBusiness && (
                <span style={{ fontSize: 12, background: 'rgba(203, 255, 77, 0.25)', color: '#CBFF4D', padding: '3px 10px', borderRadius: 99, fontWeight: 700 }}>
                  👑 VIP Business Suite
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 24, margin: '0 0 8px', color: '#fff', fontWeight: 800 }}>
              Xin chào, {companyName} 👋
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
              Hôm nay bạn đang có <b style={{ color: '#CBFF4D' }}>{openCount} tin đang mở nhận CV</b>,{' '}
              <b style={{ color: '#57C7FF' }}>{inProgressCount} việc đang thực hiện</b> và{' '}
              <b style={{ color: '#fff' }}>{totalApps} lượt ứng tuyển</b> từ các sinh viên tài năng.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-lime"
              style={{ fontWeight: 700, padding: '10px 20px', fontSize: 14, boxShadow: '0 4px 14px rgba(203, 255, 77, 0.4)' }}
              onClick={goToPostTab}
            >
              ⚡ Đăng tin mới
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', padding: '10px 18px', fontSize: 13.5 }}
              onClick={() => navigate('/wallet')}
            >
              💳 Ví ký quỹ: <b>{fmtVND(state.balance || 0)}</b>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Premium Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Card 1 */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(108, 76, 255, 0.2)',
            borderRadius: 14,
            padding: '20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
          onClick={goToJobsTab}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 28, background: 'rgba(108, 76, 255, 0.1)', padding: '8px 12px', borderRadius: 10 }}>📋</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 6 }}>
              {openCount} ACTIVE
            </span>
          </div>
          <b style={{ fontSize: 26, display: 'block', color: 'var(--ink)' }}>{openCount}</b>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, fontWeight: 500 }}>Tin đang tuyển dụng</div>
          <div style={{ fontSize: 11.5, color: 'var(--primary)', marginTop: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Quản lý tin đăng →
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(2, 132, 199, 0.2)',
            borderRadius: 14,
            padding: '20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
          onClick={goToJobsTab}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 28, background: 'rgba(2, 132, 199, 0.1)', padding: '8px 12px', borderRadius: 10 }}>⚙️</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', padding: '3px 8px', borderRadius: 6 }}>
              {inProgressCount} RUNNING
            </span>
          </div>
          <b style={{ fontSize: 26, display: 'block', color: 'var(--ink)' }}>{inProgressCount}</b>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, fontWeight: 500 }}>Công việc đang làm</div>
          <div style={{ fontSize: 11.5, color: '#0284c7', marginTop: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Theo dõi tiến độ →
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 14,
            padding: '20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
          onClick={goToJobsTab}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 28, background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: 10 }}>👥</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 8px', borderRadius: 6 }}>
              {totalApps} ỨNG VIÊN
            </span>
          </div>
          <b style={{ fontSize: 26, display: 'block', color: 'var(--ink)' }}>{totalApps}</b>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, fontWeight: 500 }}>Tổng hồ sơ ứng tuyển</div>
          <div style={{ fontSize: 11.5, color: '#10b981', marginTop: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Xem danh sách CV →
          </div>
        </div>

        {/* Card 4 */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 14,
            padding: '20px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
          onClick={() => navigate('/wallet')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <span style={{ fontSize: 28, background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: 10 }}>🛡️</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '3px 8px', borderRadius: 6 }}>
              ESCROW
            </span>
          </div>
          <b style={{ fontSize: 22, display: 'block', color: 'var(--ink)' }}>{fmtVND(paidOut)}</b>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4, fontWeight: 500 }}>Đã thanh toán an toàn</div>
          <div style={{ fontSize: 11.5, color: '#d97706', marginTop: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Quản lý dòng tiền ví →
          </div>
        </div>
      </div>

      {/* High Priority: Needs Attention Section */}
      {needsAttention.length > 0 && (
        <div className="dash-panel" style={{ marginBottom: 24, border: '1px solid var(--coral)', background: 'rgba(255, 92, 122, 0.02)' }}>
          <div className="dash-panel-head" style={{ background: 'rgba(255, 92, 122, 0.08)', borderRadius: '14px 14px 0 0' }}>
            <h4 style={{ color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span style={{ fontSize: 20 }}>⏳</span> Cần bạn xác nhận bàn giao ({needsAttention.length} công việc)
            </h4>
            <span className="chip chip-coral">Ưu tiên xử lý ngay</span>
          </div>
          {needsAttention.map((j) => (
            <div
              className="dash-job-row"
              key={j.id}
              title="Bấm để xem sản phẩm bàn giao & giải ngân"
              onClick={() => openModal('deliverableReview', { jobId: j.id })}
              style={{ cursor: 'pointer', padding: '16px 20px' }}
            >
              <div className="djr-icon"><Icon name="briefcase" /></div>
              <div className="djr-main">
                <b>{j.title}</b>
                <span>Ứng viên <b>{j.hiredApplicant}</b> đã gửi sản phẩm bàn giao — Đang chờ bạn kiểm tra & nghiệm thu.</span>
              </div>
              <span className={'djr-status ' + j.status}>{STATUS_LABEL[j.status]}</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={(e) => { e.stopPropagation(); openModal('deliverableReview', { jobId: j.id }); }}
              >
                Nghiệm thu & Giải ngân
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Action Shortcuts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, background: 'var(--surface)' }}
          onClick={goToJobsTab}
        >
          <span style={{ fontSize: 20 }}>📋</span>
          <div style={{ textAlign: 'left' }}>
            <b style={{ display: 'block', fontSize: 13.5 }}>Quản lý tin đăng</b>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Xem và duyệt ứng viên</span>
          </div>
        </button>

        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, background: 'var(--surface)' }}
          onClick={goToPostTab}
        >
          <span style={{ fontSize: 20 }}>➕</span>
          <div style={{ textAlign: 'left' }}>
            <b style={{ display: 'block', fontSize: 13.5 }}>Tạo tin tuyển dụng</b>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Đăng đề bài & ngân sách</span>
          </div>
        </button>

        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, background: 'var(--surface)' }}
          onClick={goToAdsTab}
        >
          <span style={{ fontSize: 20 }}>📢</span>
          <div style={{ textAlign: 'left' }}>
            <b style={{ display: 'block', fontSize: 13.5 }}>Chiến dịch Affiliate</b>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Mở rộng mạng lưới tuyển dụng</span>
          </div>
        </button>

        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, background: 'var(--surface)' }}
          onClick={() => navigate('/wallet')}
        >
          <span style={{ fontSize: 20 }}>💳</span>
          <div style={{ textAlign: 'left' }}>
            <b style={{ display: 'block', fontSize: 13.5 }}>Ví & Ký quỹ an toàn</b>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Nạp / Rút & Lịch sử Escrow</span>
          </div>
        </button>
      </div>

      {/* Recent Applicants Feed */}
      <div className="dash-panel" style={{ marginBottom: 24 }}>
        <div className="dash-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚡</span> Ứng viên mới nộp hồ sơ gần đây
          </h4>
          <button type="button" className="btn btn-outline btn-sm" onClick={goToJobsTab}>
            Xem tất cả ({totalApps})
          </button>
        </div>

        {recentApplicants.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <b>Chưa có ứng viên mới nộp hồ sơ</b>
            <p style={{ color: 'var(--ink-soft)', marginTop: 4, maxWidth: 440, margin: '6px auto 0' }}>
              Tin tuyển dụng của bạn đang hoạt động. Bạn có thể chia sẻ link tin hoặc bật chế độ <b>Tuyển gấp (Featured)</b> để thu hút thêm nhiều hồ sơ chất lượng!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentApplicants.map((app, i) => (
              <div
                key={app.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i !== recentApplicants.length - 1 ? '1px solid var(--border)' : 'none',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={app.name} src={app.avatar} fontSize={15} style={{ width: 42, height: 42 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{app.name}</b>
                      <span className="chip" style={{ fontSize: 11, padding: '1px 6px' }}>{app.school || 'Sinh viên'}</span>
                      <span style={{ fontSize: 12, color: '#eab308', fontWeight: 600 }}>⭐ {app.score || 95}/100</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>
                      Ứng tuyển vị trí: <b style={{ color: 'var(--primary)' }}>{app.jobTitle}</b> · {app.appliedAt || 'Gần đây'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openChatWithPerson(app.name)}
                  >
                    💬 Nhắn tin
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/employer/jobs/${app.jobId}`)}
                  >
                    Xem CV & Tuyển
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Triple-Zero Benefit Banner */}
      <div className="triple-zero" style={{ marginBottom: 24 }}>
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

      {/* Charts / Analytics */}
      <div className="dash-analytics-grid" style={{ marginTop: 10 }}>
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
  const { cancelJob, reopenJob, showToast } = useStore();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCat, setSelectedCat] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [q, statusFilter, selectedCat, sortBy]);

  // Counts by status
  const counts = useMemo(() => {
    const c = { all: state.myJobs.length, open: 0, in_progress: 0, submitted: 0, completed: 0, cancelled: 0 };
    state.myJobs.forEach(j => {
      if (c[j.status] !== undefined) c[j.status]++;
    });
    return c;
  }, [state.myJobs]);

  // Category options
  const categories = useMemo(() => {
    const cats = new Set();
    state.myJobs.forEach(j => { if (j.cat) cats.add(j.cat); });
    return Array.from(cats);
  }, [state.myJobs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = state.myJobs.filter((j) => {
      const matchSearch = needle === '' || j.title.toLowerCase().includes(needle) || (j.cat && j.cat.toLowerCase().includes(needle));
      const matchStatus = statusFilter === 'all' || j.status === statusFilter;
      const matchCat = selectedCat === 'all' || j.cat === selectedCat;
      return matchSearch && matchStatus && matchCat;
    });

    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sortBy === 'applicants') {
      list = [...list].sort((a, b) => (b.applicantsCount ?? b.applicants?.length ?? 0) - (a.applicantsCount ?? a.applicants?.length ?? 0));
    } else if (sortBy === 'budget') {
      list = [...list].sort((a, b) => (b.budget || 0) - (a.budget || 0));
    }
    return list;
  }, [state.myJobs, q, statusFilter, selectedCat, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleCopyLink = (e, jobId) => {
    e.stopPropagation();
    const url = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    showToast('Đã sao chép đường link tin tuyển dụng vào Clipboard!', '🔗');
  };

  const handleCloseJob = async (e, job) => {
    e.stopPropagation();
    if (await confirm(`Bạn có muốn đóng tin tuyển dụng "${job.title}" không? Sinh viên sẽ không thể nộp hồ sơ vào tin này nữa.`, { danger: true, confirmLabel: 'Đóng tin' })) {
      await cancelJob(job.id);
    }
  };

  const handleReopenJob = async (e, job) => {
    e.stopPropagation();
    if (await confirm(`Mở lại tin tuyển dụng "${job.title}" để tiếp tục nhận hồ sơ?`, { confirmLabel: 'Mở lại tin' })) {
      await reopenJob(job.id);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="acct-content-title" style={{ margin: '0 0 6px' }}>Quản lý tin tuyển dụng</h1>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>
            Theo dõi, chỉnh sửa và quản lý các ứng viên nộp hồ sơ vào từng vị trí công việc.
          </p>
        </div>
        <button className="btn btn-lime btn-sm" style={{ fontWeight: 700, padding: '8px 16px' }} onClick={goToPostTab}>
          <Icon name="plus" style={{ width: 14, height: 14 }} /> Đăng tin mới
        </button>
      </div>

      {/* Top Status Tabs Bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '20px 0 16px' }}>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'all' ? 'btn-primary' : 'btn-outline')}
          style={{ fontSize: 12.5, padding: '5px 12px' }}
          onClick={() => setStatusFilter('all')}
        >
          Tất cả ({counts.all})
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'open' ? 'btn-primary' : 'btn-outline')}
          style={{ fontSize: 12.5, padding: '5px 12px' }}
          onClick={() => setStatusFilter('open')}
        >
          🟢 Đang tuyển ({counts.open})
        </button>
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'in_progress' ? 'btn-primary' : 'btn-outline')}
          style={{ fontSize: 12.5, padding: '5px 12px' }}
          onClick={() => setStatusFilter('in_progress')}
        >
          ⚙️ Đang làm ({counts.in_progress})
        </button>
        {counts.submitted > 0 && (
          <button
            type="button"
            className={'btn btn-sm ' + (statusFilter === 'submitted' ? 'btn-primary' : 'btn-outline')}
            style={{ fontSize: 12.5, padding: '5px 12px', color: statusFilter === 'submitted' ? '#fff' : 'var(--coral)', borderColor: 'var(--coral)' }}
            onClick={() => setStatusFilter('submitted')}
          >
            ⏳ Chờ nghiệm thu ({counts.submitted})
          </button>
        )}
        <button
          type="button"
          className={'btn btn-sm ' + (statusFilter === 'completed' ? 'btn-primary' : 'btn-outline')}
          style={{ fontSize: 12.5, padding: '5px 12px' }}
          onClick={() => setStatusFilter('completed')}
        >
          ✅ Hoàn thành ({counts.completed})
        </button>
        {counts.cancelled > 0 && (
          <button
            type="button"
            className={'btn btn-sm ' + (statusFilter === 'cancelled' ? 'btn-primary' : 'btn-outline')}
            style={{ fontSize: 12.5, padding: '5px 12px' }}
            onClick={() => setStatusFilter('cancelled')}
          >
            ✕ Đã đóng ({counts.cancelled})
          </button>
        )}
      </div>

      {/* Main Panel */}
      <div className="dash-panel">
        {/* Search & Filter Toolbar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.6 }}>🔍</span>
            <input
              type="text"
              placeholder="Tìm theo tiêu đề tin tuyển dụng, ngành nghề..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: '100%', padding: '7px 28px 7px 32px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', boxSizing: 'border-box' }}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-soft)' }}
              >
                ✕
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
            >
              <option value="all">Tất cả ngành nghề</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '6px 12px', fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
          >
            <option value="newest">📅 Mới đăng nhất</option>
            <option value="applicants">👥 Nhiều ứng viên nhất</option>
            <option value="budget">💰 Ngân sách cao nhất</option>
          </select>
        </div>

        {/* Job Cards List */}
        {state.myJobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
            <b style={{ fontSize: 16 }}>Bạn chưa đăng tin tuyển dụng nào</b>
            <p style={{ color: 'var(--ink-soft)', marginTop: 6, maxWidth: 420, margin: '6px auto 16px' }}>
              Hãy tạo tin đăng đầu tiên để tiếp cận hàng ngàn sinh viên tài năng từ các trường đại học hàng đầu!
            </p>
            <button className="btn btn-lime" onClick={goToPostTab}>
              + Đăng tin tuyển dụng ngay
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '36px 20px' }}>
            Không tìm thấy tin tuyển dụng nào khớp với điều kiện tìm kiếm.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px' }}>
            {paged.map((j) => {
              const appsCount = j.applicantsCount ?? j.applicants?.length ?? 0;
              const hasAttachments = (j.attachmentCount > 0) || (j.attachments && j.attachments.length > 0);
              const attCount = j.attachmentCount || j.attachments?.length || 0;

              return (
                <div
                  key={j.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '18px 20px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Card Top: Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className={'djr-status ' + j.status} style={{ padding: '2px 9px', fontSize: 11.5 }}>
                        {STATUS_LABEL[j.status] || j.status}
                      </span>
                      <span className="chip" style={{ fontSize: 11.5 }}>
                        📂 {j.cat}
                      </span>
                      <span className="chip chip-lime" style={{ fontSize: 12, fontWeight: 700 }}>
                        💰 {fmtVND(j.budget)}
                      </span>
                      {j.urgent && (
                        <span className="chip chip-coral" style={{ fontSize: 11.5, fontWeight: 600 }}>
                          ⚡ Tuyển gấp
                        </span>
                      )}
                      {j.deadlineAt && (
                        <span className="chip" style={{ background: 'rgba(108, 76, 255, 0.08)', color: 'var(--primary)', fontSize: 11.5, fontWeight: 600 }}>
                          ⏱️ {formatDeadline(j.deadlineAt)}
                        </span>
                      )}
                      {hasAttachments && (
                        <span className="chip chip-lime" style={{ fontSize: 11.5, fontWeight: 600 }}>
                          📎 {attCount} tệp đính kèm
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      Mã tin: <b>#{j.id}</b>
                    </span>
                  </div>

                  {/* Card Middle: Title & Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h3
                        style={{
                          margin: '0 0 6px',
                          fontSize: 16.5,
                          color: 'var(--ink)',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                        onClick={() => navigate(`/employer/jobs/${j.id}`)}
                      >
                        {j.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                        <span>📅 Đăng ngày: <b style={{ color: 'var(--ink)' }}>{j.posted || 'gần đây'}</b></span>
                        {j.hiredApplicant && (
                          <span style={{ color: 'var(--primary)', fontWeight: 600, background: 'rgba(108, 76, 255, 0.08)', padding: '2px 8px', borderRadius: 6 }}>
                            👤 Đang làm: {j.hiredApplicant}
                          </span>
                        )}
                        {j.status === 'submitted' && (
                          <span style={{ color: 'var(--coral)', fontWeight: 700 }}>
                            ⚠️ Sinh viên đã gửi sản phẩm bàn giao!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Applicants Count & Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      paddingTop: 12,
                      borderTop: '1px dashed var(--border)',
                    }}
                  >
                    {/* Left: Applicant Preview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        👥 <b>{appsCount}</b> ứng viên đã nộp
                      </span>
                      {j.applicants && j.applicants.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                          {j.applicants.slice(0, 3).map((a, i) => (
                            <Avatar
                              key={i}
                              name={a.name}
                              src={a.avatar}
                              fontSize={10}
                              style={{ width: 22, height: 22, border: '2px solid #fff', marginLeft: i > 0 ? -6 : 0 }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 12.5, padding: '5px 14px', fontWeight: 600 }}
                        onClick={() => navigate(`/employer/jobs/${j.id}`)}
                      >
                        👥 Quản lý ứng viên ({appsCount}) →
                      </button>

                      {j.status === 'open' && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => navigate(`/employer/jobs/${j.id}/edit`)}
                          title="Chỉnh sửa nội dung tin"
                        >
                          ✏️ Sửa tin
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={(e) => handleCopyLink(e, j.id)}
                        title="Sao chép link tin công khai"
                      >
                        🔗 Copy link
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => navigate(`/jobs/${j.id}`)}
                        title="Xem trang hiển thị công khai cho sinh viên"
                      >
                        🌐 Xem tin
                      </button>

                      {j.status === 'open' ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 12, padding: '5px 10px', color: 'var(--coral)', borderColor: 'var(--coral)' }}
                          onClick={(e) => handleCloseJob(e, j)}
                          title="Đóng tin tuyển dụng"
                        >
                          ✕ Đóng
                        </button>
                      ) : j.status === 'cancelled' ? (
                        <button
                          type="button"
                          className="btn btn-lime btn-sm"
                          style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={(e) => handleReopenJob(e, j)}
                          title="Mở lại tin tuyển dụng"
                        >
                          🔄 Mở lại
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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

export default function Dashboard({ forcedTab }) {
  const { state, updateAdsSettings, openChatWithPerson, refreshMyJobs, clearEditJob, startEditJob } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Xác định tab hiện tại từ URL path hoặc forcedTab
  const tab = useMemo(() => {
    if (forcedTab) return forcedTab;
    const p = location.pathname;
    if (p.includes('/jobs/') && p.endsWith('/edit')) return 'edit';
    if (p === '/employer/post-job' || p === '/employer/create-job' || p === '/dashboard/post-job' || p === '/post-job') return 'post';
    if (p === '/employer/jobs' || p === '/dashboard/jobs') return 'jobs';
    if (p === '/employer/ads' || p === '/dashboard/ads') return 'ads';
    if (p === '/employer' || p === '/employer/dashboard' || p === '/dashboard') return 'overview';
    const queryTab = searchParams.get('tab');
    if (queryTab && ['overview', 'jobs', 'post', 'ads', 'edit'].includes(queryTab)) return queryTab;
    return 'overview';
  }, [forcedTab, location.pathname, searchParams]);

  useEffect(() => {
    if (refreshMyJobs) refreshMyJobs();
  }, [refreshMyJobs]);

  useEffect(() => {
    if (tab === 'edit' && params.jobId) {
      if (startEditJob) startEditJob(Number(params.jobId));
    } else if (tab === 'post') {
      if (clearEditJob) clearEditJob();
    }
  }, [tab, params.jobId, startEditJob, clearEditJob]);

  const activeSidebarTab = tab === 'edit' ? 'post' : tab;

  return (
    <div className="page active">
      <div className="acct-settings-layout">
        <DashboardSidebar activeTab={activeSidebarTab} />

        <div className="acct-content">
          {tab === 'overview' && (
            <OverviewTab
              state={state}
              navigate={navigate}
              openModal={openModal}
              goToJobsTab={() => navigate('/employer/jobs')}
              goToPostTab={() => navigate('/employer/post-job')}
              goToAdsTab={() => navigate('/employer/ads')}
            />
          )}

          {tab === 'jobs' && (
            <JobsTab
              state={state}
              navigate={navigate}
              openModal={openModal}
              goToPostTab={() => navigate('/employer/post-job')}
            />
          )}

          {(tab === 'post' || tab === 'edit') && (
            <>
              <h1 className="acct-content-title">
                {tab === 'edit' || state.editingJobId ? 'Chỉnh sửa tin tuyển dụng' : 'Đăng tin tuyển dụng mới'}
              </h1>
              <div style={{ marginTop: 20 }}>
                <PostJobForm
                  onDone={() => navigate('/employer/jobs')}
                  onCancelEdit={() => navigate('/employer/jobs')}
                />
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