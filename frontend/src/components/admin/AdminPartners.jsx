import { useAdmin } from '../../context/AdminContext';
import { fmtVND } from '../../context/StoreContext';

export default function AdminPartners() {
  const { partners, campaigns, adQueue, approvePartner, toggleCampaign, approveAdContent } = useAdmin();

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý đối tác & quảng cáo</h2>
        <p>Duyệt đối tác affiliate, quản lý chiến dịch CPC và nội dung quảng cáo hiển thị cho sinh viên.</p>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Đối tác Affiliate</h4></div>
        {partners.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}><b>{p.name}</b><br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.category}</span></div>
            <span className="chip">{p.status === 'approved' ? '✓ Đã duyệt' : '⏳ Chờ duyệt'}</span>
            {p.status !== 'approved' && <button className="btn btn-primary btn-sm" onClick={() => approvePartner(p.id)}>Duyệt đối tác</button>}
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Chiến dịch CPC doanh nghiệp</h4><span className="sub">$0.10 / click</span></div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>Doanh nghiệp</th><th>Ngân sách</th><th>Đã dùng</th><th>Số click</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.company}</td>
                  <td>{fmtVND(c.budget)}</td>
                  <td>{fmtVND(c.spent)}</td>
                  <td>{c.clicks.toLocaleString('vi-VN')}</td>
                  <td><span className="chip">{c.status === 'active' ? 'Đang chạy' : 'Tạm dừng'}</span></td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => toggleCampaign(c.id)}>{c.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Nội dung quảng cáo chờ duyệt</h4></div>
        {adQueue.length === 0 ? <div className="adm-empty">Không có nội dung nào chờ duyệt.</div> : adQueue.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}><b>{a.title}</b><br /><span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{a.sponsor}</span></div>
            <button className="btn btn-primary btn-sm" onClick={() => approveAdContent(a.id)}>Duyệt nội dung</button>
          </div>
        ))}
      </div>
    </section>
  );
}
