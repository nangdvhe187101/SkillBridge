import { growthBarsSeed, funnelSeed } from '../../data/adminSeed';

export default function AdminAnalytics() {
  const kpis = [
    { label: 'Tổng người dùng', value: '10,240' },
    { label: 'Tăng trưởng MoM', value: '+18.4%' },
    { label: 'Thời gian ghép việc TB', value: '13 phút' },
    { label: 'Tỷ lệ hoàn thành việc', value: '91.2%' },
  ];
  const sustainKpis = [
    { label: 'Retention 30 ngày', value: '64%' },
    { label: 'LTV trung bình', value: '620.000đ' },
    { label: 'CAC trung bình', value: '85.000đ' },
    { label: 'LTV : CAC', value: '7.3x' },
  ];
  const maxFunnel = funnelSeed[0].value;

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Báo cáo & phân tích</h2>
        <p>Tăng trưởng người dùng, hiệu suất matching, phễu chuyển đổi và các chỉ số bền vững (Retention, LTV/CAC).</p>
      </div>
      <div className="adm-kpis">
        {kpis.map((k) => <div className="adm-kpi" key={k.label}><div className="k-lbl">{k.label}</div><div className="k-val">{k.value}</div></div>)}
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Tăng trưởng người dùng theo trường</h4></div>
        <div className="adm-bars">
          {growthBarsSeed.map((b) => (
            <div className="adm-bar-col" key={b.label}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{b.value}</span>
              <div className="bar" style={{ height: `${(b.value / b.max) * 100}%` }} />
              <span className="bar-lbl">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Phễu chuyển đổi</h4><span className="sub">Đăng ký → Xác thực → Đăng tin/Ứng tuyển → Hoàn thành → Thanh toán</span></div>
        <div className="adm-funnel">
          {funnelSeed.map((f, i) => (
            <div key={i} className="adm-funnel-row" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, width: 190, flexShrink: 0 }}>{f.label}</span>
              <div style={{ flex: 1, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', height: 18 }}>
                <div style={{ width: `${(f.value / maxFunnel) * 100}%`, height: '100%', background: 'var(--primary)' }} />
              </div>
              <b style={{ fontSize: 12, width: 60, textAlign: 'right' }}>{f.value.toLocaleString('vi-VN')}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Sustainability Analysis</h4></div>
        <div className="adm-kpis">
          {sustainKpis.map((k) => <div className="adm-kpi" key={k.label}><div className="k-lbl">{k.label}</div><div className="k-val">{k.value}</div></div>)}
        </div>
      </div>
    </section>
  );
}
