import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useStore, fmtVND } from '../context/StoreContext';
import { useModal } from '../context/ModalContext';
import { useConfirm } from '../context/ConfirmContext';

const STATUS_LABEL = {
  open: 'Đang tuyển', filled: 'Đã đầy', in_progress: 'Đang thực hiện', submitted: 'Chờ xác nhận bàn giao',
  revision_requested: 'Đang chờ SV sửa lại', completed: 'Hoàn thành', cancelled: 'Đã hủy',
};

function formatDeadline(ts) {
  if (!ts) return '—';
  const diff = ts - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

export default function Dashboard() {
  const { state, markJobComplete } = useStore();
  const { openModal } = useModal();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleMarkComplete = async (e, job) => {
    e.stopPropagation();
    const msg = job.deliverable
      ? `Xác nhận "${job.title}" đã hoàn thành? Tiền ký quỹ sẽ được giải ngân cho ${job.hiredApplicant}.`
      : `Sinh viên chưa nộp bàn giao qua hệ thống. Vẫn xác nhận "${job.title}" đã hoàn thành và giải ngân ${fmtVND(job.escrowAmount || job.budget)} cho ${job.hiredApplicant}?`;
    if (await confirm(msg, { confirmLabel: 'Xác nhận hoàn thành' })) {
      markJobComplete(job.id);
      openModal('receipt', { justCompletedId: job.id });
    }
  };

  const [adsOn, setAdsOn] = useState(true);
  const [budget, setBudget] = useState(120000);
  const [audience, setAudience] = useState('Sinh viên khối Kinh tế');

  const openCount = state.myJobs.filter((j) => j.status === 'open').length;
  const totalApps = state.myJobs.reduce((s, j) => s + j.applicants.length, 0);
  const paidOut = state.transactions.filter((t) => t.type === 'escrow_release').reduce((s, t) => s + t.amount, 0);
  const triZeroLeft = Math.max(0, 3 - state.triZeroUsed);

  const clicksPerDay = useMemo(() => Math.max(0, Math.round(budget / 2400)), [budget]);

  return (
    <div className="page active">
      <div className="dash-hero wrap">
        <h1>
          Dashboard nhà tuyển dụng
          {state.vipBusiness && <span className="chip chip-lime" style={{ verticalAlign: 'middle', marginLeft: 8 }}>👑 VIP Business Suite</span>}
        </h1>
        <p>Quản lý tin đăng, theo dõi ứng viên và ưu đãi Triple-Zero của bạn.</p>
        <div className="dash-stats">
          <div className="dstat"><b>{openCount}</b><span>Tin đang tuyển</span></div>
          <div className="dstat"><b>{totalApps}</b><span>Tổng ứng viên</span></div>
          <div className="dstat"><b>{fmtVND(paidOut)}</b><span>Đã chi trả qua nền tảng</span></div>
          <div className="dstat"><b>~{fmtVND(Math.round(paidOut * 0.05))}</b><span>Tiết kiệm nhờ Triple-Zero</span></div>
        </div>
        <div className="triple-zero">
          <div className="tz-info">
            <h4>🎁 Ưu đãi "Triple-Zero" — Miễn phí hoa hồng 3 tin đăng đầu tiên</h4>
            <p>
              {state.vipBusiness ? (
                <>Bạn đang dùng gói <b>VIP Business Suite</b> — phí nền tảng đã giảm còn <b>5%</b>/công việc cho mọi tin đăng, không phụ thuộc số tin Triple-Zero còn lại.</>
              ) : (
                <>Bạn đã dùng {state.triZeroUsed}/3 lượt miễn phí. Từ tin thứ 4, phí nền tảng tiêu chuẩn 10%/công việc sẽ được áp dụng (giảm còn 5% nếu nâng cấp VIP Business Suite).</>
              )}
            </p>
            <div className="tz-bar"><div className="tz-fill" style={{ width: `${(state.triZeroUsed / 3) * 100}%` }} /></div>
          </div>
          <div className="tz-count">{state.triZeroUsed}/3</div>
          {!state.vipBusiness && <button className="btn btn-primary btn-sm" onClick={() => navigate('/pricing')}>Nâng cấp VIP</button>}
        </div>
      </div>

      <div className="dash-body wrap">
        <div className="dash-grid">
          <div className="dash-panel">
            <div className="dash-panel-head">
              <h4>Tin đã đăng</h4>
              <button className="btn btn-lime btn-sm" onClick={() => navigate('/post-job')}>
                <Icon name="plus" style={{ width: 14, height: 14 }} /> Đăng tin mới
              </button>
            </div>
            {state.myJobs.length === 0 ? (
              <div className="empty-state">Bạn chưa đăng tin nào. Hãy đăng tin đầu tiên!</div>
            ) : (
              state.myJobs.map((j) => (
                <div className="dash-job-row" key={j.id} title="Bấm để xem ứng viên & chi tiết công việc" onClick={() => openModal('applicants', { jobId: j.id })}>
                  <div className="djr-icon"><Icon name="briefcase" /></div>
                  <div className="djr-main">
                    <b>{j.title}</b>
                    <span>
                      {j.hiredApplicant ? `Đã thuê ${j.hiredApplicant} · ` : ''}
                      {['in_progress', 'submitted', 'revision_requested'].includes(j.status) && j.deadlineAt ? `Hạn: ${formatDeadline(j.deadlineAt)} · ` : ''}
                      Đăng {j.posted}
                    </span>
                  </div>
                  <span className={'djr-status ' + j.status}>{STATUS_LABEL[j.status] || j.status}</span>
                  <span className="djr-apps">{j.applicants.length} ứng viên</span>
                  {j.status === 'submitted' && (
                    <button className="btn btn-primary btn-sm" title="Xem bàn giao & xác nhận"
                      onClick={(e) => { e.stopPropagation(); openModal('deliverableReview', { jobId: j.id }); }}>
                      Xem bàn giao
                    </button>
                  )}
                  {j.status === 'in_progress' && (
                    <button className="btn btn-outline btn-sm" title="Đánh dấu hoàn thành & thanh toán"
                      onClick={(e) => handleMarkComplete(e, j)}>
                      Hoàn thành
                    </button>
                  )}
                  <span className="djr-chev" aria-hidden="true"><Icon name="chevright" /></span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ads-panel">
          <div className="ads-head">
            <div>
              <h4>📢 Quảng cáo Affiliate (CPC) <span className="chip chip-lime">Enterprise</span></h4>
              <p>Trả theo mỗi lượt click ứng viên quan tâm — không cần thương lượng từng công việc. Khi sinh viên click vào quảng cáo, hệ thống <b>One-Touch Portfolio Generator</b> tự động gửi thẳng hồ sơ đã xác thực của họ đến bạn.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={adsOn} onChange={(e) => setAdsOn(e.target.checked)} />
              <span className="switch-track" />
            </label>
          </div>

          <div className="ads-body-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Ngân sách mỗi ngày (VND)</label>
              <input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value) || 0)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Đối tượng tiếp cận</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option>Sinh viên khối Kinh tế</option>
                <option>Sinh viên Digital Arts / Thiết kế</option>
                <option>Toàn bộ sinh viên đã xác thực</option>
              </select>
            </div>
          </div>

          <div className="ads-stats">
            <div className="astat"><b>2.400đ</b><span>CPC cố định (~$0.10)</span></div>
            <div className="astat"><b>{adsOn ? clicksPerDay : 0}</b><span>Ước tính lượt click/ngày</span></div>
            <div className="astat"><b>{adsOn ? clicksPerDay : 0}</b><span>Hồ sơ tự động nhận được</span></div>
            <div className="astat"><b>0/50</b><span>Lượt click miễn phí đã dùng</span></div>
          </div>
          <div className="ads-note">🎁 50 lượt click chất lượng cao đầu tiên được miễn phí khi xác thực tài khoản doanh nghiệp — thiết lập ROI trước khi tính phí chính thức.</div>
        </div>
      </div>
    </div>
  );
}
