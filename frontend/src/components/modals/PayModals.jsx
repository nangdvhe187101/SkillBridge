import { useState } from 'react';
import ModalShell from './ModalShell';
import PaymentMethods, { payMethodLabel } from './PaymentMethods';
import { useStore, commissionRate, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

export function TopupModal({ onClose }) {
  const { topup, state } = useStore();
  const [amount, setAmount] = useState(200000);
  const [method, setMethod] = useState('bank');

  const confirm = () => {
    if (!amount || amount <= 0) return;
    topup(amount, payMethodLabel(method));
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>Nạp tiền vào ví</h3>
      <p>Chọn số tiền và phương thức nạp — đây là mô phỏng demo, không phát sinh giao dịch thật.</p>
      <div className="amt-chip-row">
        {[100000, 200000, 500000, 1000000].map((v) => (
          <button key={v} className={'amt-chip' + (amount === v ? ' is-active' : '')} onClick={() => setAmount(v)}>{fmtVND(v)}</button>
        ))}
      </div>
      <div className="field">
        <label>Hoặc nhập số tiền khác (VND)</label>
        <input type="number" placeholder="Ví dụ 300000" onChange={(e) => setAmount(Number(e.target.value) || 0)} />
      </div>
      <PaymentMethods selected={method} onSelect={setMethod} walletBalance={state.balance} />
      {method === 'bank' && (
        <div className="qr-box"><div className="qr-img" /><span>Quét mã QR bằng app ngân hàng bất kỳ để nạp <b>{fmtVND(amount)}</b> (demo)</span></div>
      )}
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={confirm}>Xác nhận nạp tiền</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function WithdrawModal({ onClose }) {
  const { withdraw, state } = useStore();
  const [amount, setAmount] = useState(100000);
  const confirm = () => {
    if (!amount || amount <= 0 || amount > state.balance) return;
    withdraw(amount);
    onClose();
  };
  return (
    <ModalShell onClose={onClose}>
      <h3>Rút tiền về ngân hàng</h3>
      <p>Số dư khả dụng: <b>{fmtVND(state.balance)}</b>. Tiền thường về tài khoản trong 24 giờ (mô phỏng demo).</p>
      <div className="field">
        <label>Số tiền muốn rút (VND)</label>
        <input type="number" defaultValue={100000} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
      </div>
      <div className="field">
        <label>Tài khoản nhận</label>
        <input type="text" disabled style={{ opacity: 0.7 }} defaultValue="**** **** 4821 · Vietcombank" />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={confirm}>Xác nhận rút tiền</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function SubscribeModal({ onClose }) {
  const { subscribePro, state } = useStore();
  const [method, setMethod] = useState('wallet');
  const amount = 49000;
  const confirm = () => {
    if (method === 'wallet' && state.balance < amount) return;
    subscribePro(amount, method);
    onClose();
  };
  return (
    <ModalShell onClose={onClose}>
      <h3>Thanh toán gói Freelance Pro</h3>
      <div className="checkout-summary">
        <div className="cs-row"><span>Gói Freelance Pro (1 tháng)</span><span>{fmtVND(amount)}</span></div>
        <div className="cs-row"><span>Thuế / phí xử lý</span><span>0đ</span></div>
        <div className="cs-row total"><span>Tổng thanh toán</span><span>{fmtVND(amount)}</span></div>
      </div>
      <PaymentMethods selected={method} onSelect={setMethod} walletBalance={state.balance} />
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={confirm}>Thanh toán & nâng cấp</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function UpgradeVipModal({ onClose }) {
  const { upgradeVip, state } = useStore();
  const amount = 199000;
  const [method, setMethod] = useState(() => (state.balance >= amount ? 'wallet' : 'bank'));
  const confirm = () => {
    if (method === 'wallet' && state.balance < amount) return;
    upgradeVip(amount, method);
    onClose();
  };
  return (
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 32 }}>👑</div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Nâng cấp VIP Business Suite</h3>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Dành cho Doanh nghiệp & Agency</span>
        </div>
      </div>

      <div className="checkout-summary">
        <div className="cs-row"><span>Gói VIP Business Suite (1 tháng)</span><span>{fmtVND(amount)}</span></div>
        <div className="cs-row"><span>Hoa hồng ký quỹ</span><span style={{ color: '#16a34a', fontWeight: 700 }}>Giảm 50% (còn 5%)</span></div>
        <div className="cs-row"><span>Ghim tin Featured tặng kèm</span><span style={{ color: '#16a34a', fontWeight: 700 }}>Miễn phí 1 tin/tháng</span></div>
        <div className="cs-row"><span>Trích Quỹ Bảo hiểm (10%)</span><span>{fmtVND(Math.round(amount * 0.1))}</span></div>
        <div className="cs-row total"><span>Tổng thanh toán</span><span>{fmtVND(amount)}</span></div>
      </div>

      <PaymentMethods selected={method} onSelect={setMethod} walletBalance={state.balance} />

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={confirm}>
          👑 Thanh toán & Kích hoạt VIP
        </button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function HireModal({ onClose, jobId, applicantIdx, applicantName, applicant, job: propJob }) {
  const { state, hire } = useStore();
  const { openModal } = useModal();
  const localJob = state.myJobs.find((j) => String(j.id) === String(jobId));
  const job = propJob || localJob || { id: jobId, title: 'Công việc', budget: 150000 };
  const a = applicant || (applicantName ? { name: applicantName } : (job?.applicants?.[applicantIdx] || { name: 'Ứng viên' }));

  const rate = commissionRate(state);
  const commission = Math.round((job?.budget || 0) * rate);
  const total = (job?.budget || 0) + commission;

  // Smart default: If wallet has enough funds use 'wallet', else default to 'bank' (QR)
  const [method, setMethod] = useState(() => (state.balance >= total ? 'wallet' : 'bank'));
  const [days, setDays] = useState(3);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!job || !a) return null;

  const isWalletInsufficient = method === 'wallet' && state.balance < total;

  const confirm = async () => {
    setErrorMsg('');
    if (!days || days <= 0) {
      setErrorMsg('Vui lòng nhập số ngày hoàn thành hợp lệ.');
      return;
    }
    if (isWalletInsufficient) {
      setErrorMsg(`Số dư ví hiện tại (${fmtVND(state.balance)}) không đủ để ký quỹ ${fmtVND(total)}. Vui lòng nạp thêm hoặc chọn phương thức thanh toán khác.`);
      return;
    }
    try {
      setSubmitting(true);
      await hire({
        jobId: job.id,
        applicantIdx,
        applicantName: a.name,
        applicant: a,
        applicationId: a.applicationId || a.id,
        days: Number(days),
        method
      });
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi thuê ứng viên.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopup = () => {
    onClose();
    openModal('topup');
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>Thuê & thanh toán ký quỹ</h3>
      <p>Bạn sắp thuê <b>{a.name}</b> cho công việc "<b>{job.title}</b>". Tiền sẽ được giữ an toàn (escrow) tại SkillBridge và chỉ giải ngân khi công việc hoàn thành.</p>
      <div className="checkout-summary">
        <div className="cs-row"><span>Ngân sách công việc</span><span>{fmtVND(job.budget)}</span></div>
        <div className="cs-row"><span>Phí nền tảng ({Math.round(rate * 100)}%){state.vipBusiness ? ' · VIP Business Suite' : ''}</span><span>{fmtVND(commission)}</span></div>
        <div className="cs-row total"><span>Tổng cần thanh toán</span><span>{fmtVND(total)}</span></div>
      </div>
      <div className="field">
        <label>Hạn hoàn thành (số ngày)</label>
        <input type="number" min="1" step="1" value={days} onChange={(e) => { setDays(e.target.value); setErrorMsg(''); }} />
      </div>
      <PaymentMethods selected={method} onSelect={(m) => { setMethod(m); setErrorMsg(''); }} walletBalance={state.balance} />

      {isWalletInsufficient && (
        <div style={{ background: 'rgba(255, 92, 122, 0.12)', border: '1px solid var(--coral)', borderRadius: 10, padding: 12, margin: '12px 0', fontSize: 13 }}>
          <b style={{ color: 'var(--coral)' }}>⚠️ Số dư ví không đủ ({fmtVND(state.balance)} / {fmtVND(total)})</b>
          <p style={{ marginTop: 4, color: 'var(--ink-soft)' }}>Bạn có thể chọn thanh toán qua <b>QR ngân hàng</b> hoặc nạp thêm tiền vào ví.</p>
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={handleTopup}>
            💳 Nạp thêm vào ví →
          </button>
        </div>
      )}

      {errorMsg && !isWalletInsufficient && (
        <div className="field-error" style={{ margin: '10px 0' }}>{errorMsg}</div>
      )}

      <div className="modal-actions">
        <button className="btn btn-primary" disabled={submitting} onClick={confirm}>
          {submitting ? 'Đang xử lý...' : 'Xác nhận thuê & ký quỹ'}
        </button>
        <button className="btn btn-outline" disabled={submitting} onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}

export function ClaimModal({ onClose }) {
  const { state, submitClaim } = useStore();
  const eligibleApps = state.myApplications.filter((a) => ['hired', 'submitted', 'completed', 'cancelled'].includes(a.status));
  const [appId, setAppId] = useState(eligibleApps[0]?.id || '');
  const [desc, setDesc] = useState('');

  const confirm = () => {
    const app = eligibleApps.find((a) => a.id === appId);
    if (!desc.trim() || !app) return;
    submitClaim({ jobTitle: app.title, jobBudget: app.budget, desc: desc.trim() });
    onClose();
  };

  return (
    <ModalShell onClose={onClose}>
      <h3>🛡️ Gửi khiếu nại bồi thường</h3>
      <p>Quỹ Bảo hiểm Tương hỗ Cộng đồng có thể bồi thường 30–50% giá trị công việc nếu bạn bị quỵt tiền.</p>
      {eligibleApps.length === 0 ? (
        <div className="empty-state">Bạn chưa có công việc nào đủ điều kiện gửi khiếu nại.</div>
      ) : (
        <>
          <div className="field">
            <label>Công việc liên quan</label>
            <select value={appId} onChange={(e) => setAppId(e.target.value)}>
              {eligibleApps.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Mô tả bằng chứng / tình huống</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ví dụ: đã giao sản phẩm qua chat lúc 20h ngày X nhưng nhà tuyển dụng không phản hồi và không thanh toán..." />
          </div>
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-primary" disabled={eligibleApps.length === 0} onClick={confirm}>Gửi khiếu nại</button>
        <button className="btn btn-outline" onClick={onClose}>Hủy</button>
      </div>
    </ModalShell>
  );
}
