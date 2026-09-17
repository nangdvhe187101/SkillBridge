import { useAdmin } from '../context/AdminContext';
import { fmtVND } from '../utils/formatters';
import { revenueBarsSeed } from '../data/adminSeed';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../utils/fileDownloader';
import Icon from './Icon';

export default function AdminFinance() {
  const { subscriptions, renewSubscription, cancelSubscription } = useAdmin();
  const state = {
    transactions: [],
    insuranceFund: 8200000,
    claims: [
      { id: 'CLM-101', jobTitle: 'Biên tập 5 bài viết SEO Website', desc: 'Nhà tuyển dụng không phản hồi sau khi nhận bài 7 ngày', payout: 150000, status: 'resolved', statusLabel: 'Đã bồi thường 40%', date: '19/08/2026' },
      { id: 'CLM-102', jobTitle: 'Dựng motion graphic intro 10s', desc: 'Đang gửi bằng chứng đối soát video demo', payout: 0, status: 'pending', statusLabel: 'Đang chờ HĐ Bảo hiểm duyệt', date: '21/08/2026' },
    ]
  };
  const totalRevenue = revenueBarsSeed.reduce((s, b) => s + b.value, 0);

  const kpis = [
    { label: 'Tổng doanh thu', value: fmtVND(totalRevenue) },
    { label: 'Doanh thu tháng này', value: fmtVND(36500000) },
    { label: 'Tăng trưởng MoM', value: '+18.4%' },
    { label: 'ARPU', value: '420.000đ' },
  ];

  const exportReport = (period, format = 'xlsx') => {
    const labels = { week: 'tuan', month: 'thang', quarter: 'quy' };
    const periodNames = { week: 'Tuần này', month: 'Tháng này', quarter: 'Quý này' };
    const metadata = {
      userName: 'Ban Quản trị Tài chính SkillBridge',
      userEmail: 'finance-admin@skillbridge.vn',
      filterLabel: `Báo cáo tài chính & doanh thu (${periodNames[period] || period})`,
      fileName: `Bao_cao_tai_chinh_SkillBridge_${labels[period]}.${format}`
    };

    if (format === 'csv') {
      exportTransactionsToCSV(state.transactions, metadata);
    } else {
      exportTransactionsToExcel(state.transactions, metadata);
    }
    showToast(`Đã xuất báo cáo tài chính ${format.toUpperCase()} (${periodNames[period]}) thành công!`, 'check');
  };


  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý tài chính & doanh thu</h2>
        <p>Tổng quan 4 nguồn doanh thu, Quỹ bảo hiểm cộng đồng và quản lý gói nâng cấp.</p>
      </div>
      <div className="adm-kpis">
        {kpis.map((k) => <div className="adm-kpi" key={k.label}><div className="k-lbl">{k.label}</div><div className="k-val">{k.value}</div></div>)}
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Doanh thu theo nguồn</h4><span className="sub">Kỳ hiện tại (tháng này)</span></div>
        <div className="adm-bars">
          {revenueBarsSeed.map((b) => (
            <div className="adm-bar-col" key={b.label} title={fmtVND(b.value)}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{fmtVND(b.value)}</span>
              <div className="bar" style={{ height: `${(b.value / b.max) * 100}%` }} />
              <span className="bar-lbl">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield-check" width="16" height="16" /> Quỹ bảo hiểm cộng đồng
          </h4>
        </div>
        <div className="adm-kpis" style={{ marginBottom: 6 }}>
          <div className="adm-kpi"><div className="k-lbl">Số dư quỹ</div><div className="k-val">{fmtVND(state.insuranceFund || 0)}</div></div>
          <div className="adm-kpi"><div className="k-lbl">Đã chi trả (tổng)</div><div className="k-val">{fmtVND((state.claims || []).reduce((s, c) => s + (c.payout || 0), 0))}</div></div>
          <div className="adm-kpi"><div className="k-lbl">Số ca đã xử lý</div><div className="k-val">{(state.claims || []).length}</div></div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Quản lý gói nâng cấp</h4></div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Người dùng</th><th>Gói</th><th>Ngày gia hạn</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td>{s.user}</td><td>{s.plan}</td><td>{s.renewAt}</td>
                  <td><span className="chip">{s.status === 'active' ? 'Đang hoạt động' : 'Sắp hết hạn'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                      {s.status === 'expiring' && <button className="btn btn-outline btn-sm" onClick={() => renewSubscription(s.id)}>Gia hạn</button>}
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
                        onClick={async () => { if (await confirm(`Huỷ gói ${s.plan} của ${s.user}?`, { danger: true, confirmLabel: 'Huỷ gói' })) cancelSubscription(s.id); }}>Huỷ gói</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h4>Xuất báo cáo tài chính</h4>
          <span className="sub">Trích xuất bảng kê chi tiết và tổng hợp doanh thu theo kỳ</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', minWidth: 140 }}>
              📊 Xuất file Excel (.xlsx):
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => exportReport('week', 'xlsx')}>
                Báo cáo tuần (.xlsx)
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => exportReport('month', 'xlsx')}>
                Báo cáo tháng (.xlsx)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => exportReport('quarter', 'xlsx')}>
                Báo cáo quý (.xlsx)
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', minWidth: 140 }}>
              📄 Xuất file CSV (.csv):
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => exportReport('week', 'csv')}>
                Báo cáo tuần (.csv)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => exportReport('month', 'csv')}>
                Báo cáo tháng (.csv)
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => exportReport('quarter', 'csv')}>
                Báo cáo quý (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
