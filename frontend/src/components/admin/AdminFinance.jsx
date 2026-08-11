import { useAdmin } from '../../context/AdminContext';
import { useStore, fmtVND } from '../../context/StoreContext';
import { revenueBarsSeed } from '../../data/adminSeed';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function AdminFinance() {
  const { subscriptions, renewSubscription, cancelSubscription } = useAdmin();
  const confirm = useConfirm();
  const { state } = useStore();
  const { showToast } = useToast();
  const totalRevenue = revenueBarsSeed.reduce((s, b) => s + b.value, 0);

  const kpis = [
    { label: 'Tổng doanh thu tháng', value: fmtVND(totalRevenue) },
    { label: 'Quỹ Bảo hiểm hiện có', value: fmtVND(state.insuranceFund) },
    { label: 'Gói đang hoạt động', value: subscriptions.filter((s) => s.status === 'active').length },
    { label: 'Hoa hồng trung bình', value: '9.2%' },
  ];

  const exportReport = (period) => {
    const labels = { week: 'tuần', month: 'tháng', quarter: 'quý' };
    showToast(`Đã xuất báo cáo tài chính theo ${labels[period]} (mô phỏng demo).`, '📄');
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
        <div className="adm-card-head"><h4>🛡️ Quỹ bảo hiểm cộng đồng</h4></div>
        <div className="adm-kpis" style={{ marginBottom: 6 }}>
          <div className="adm-kpi"><div className="k-lbl">Số dư quỹ</div><div className="k-val">{fmtVND(state.insuranceFund)}</div></div>
          <div className="adm-kpi"><div className="k-lbl">Đã chi trả (tổng)</div><div className="k-val">{fmtVND(state.claims.reduce((s, c) => s + c.payout, 0))}</div></div>
          <div className="adm-kpi"><div className="k-lbl">Số ca đã xử lý</div><div className="k-val">{state.claims.length}</div></div>
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
        <div className="adm-card-head"><h4>Xuất báo cáo tài chính</h4></div>
        <div className="adm-toolbar">
          <button className="btn btn-outline btn-sm" onClick={() => exportReport('week')}>Xuất báo cáo tuần</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportReport('month')}>Xuất báo cáo tháng</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportReport('quarter')}>Xuất báo cáo quý</button>
        </div>
      </div>
    </section>
  );
}
