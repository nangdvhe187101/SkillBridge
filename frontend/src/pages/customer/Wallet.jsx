import { useNavigate } from 'react-router-dom';
import { useStore, fmtVND, TX_ICON } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';

export default function Wallet() {
  const { state } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  return (
    <div className="page active">
      <div className="wallet-hero">
        <div className="wrap">
          <div className="wallet-balance-card">
            <div>
              <div className="wallet-balance-lbl">Số dư khả dụng · Ví SkillBridge</div>
              <div className="wallet-balance-num">{fmtVND(state.balance)}</div>
            </div>
            <div className="wallet-actions">
              <button className="btn btn-lime btn-sm" onClick={() => openModal('topup')}>+ Nạp tiền</button>
              <button className="btn btn-sm" onClick={() => openModal('withdraw')}>Rút tiền</button>
            </div>
          </div>
        </div>
      </div>

      <div className="wallet-body wrap">
        <div className="wallet-grid">
          <div className="pcard">
            <h4>Lịch sử giao dịch</h4>
            {state.transactions.length === 0 ? (
              <div className="empty-state">Chưa có giao dịch nào.</div>
            ) : (
              state.transactions.map((t) => (
                <div className="tx-row" key={t.id}>
                  <div className="tx-ic">{TX_ICON[t.type] || '💳'}</div>
                  <div className="tx-main"><b>{t.label}</b><span>{t.date}</span></div>
                  <div className={'tx-amt' + (t.sign > 0 ? ' pos' : ' neg')}>{t.sign > 0 ? '+' : '-'}{fmtVND(t.amount)}</div>
                </div>
              ))
            )}
          </div>

          <div className="pcard">
            <h4>🧾 Biên nhận giao dịch</h4>
            <p className="sub" style={{ marginTop: -6 }}>Biên nhận được tạo tự động sau mỗi lần giải ngân — dùng làm căn cứ minh bạch thu nhập.</p>
            {state.receipts.length === 0 ? (
              <div className="empty-state">Chưa có biên nhận nào.</div>
            ) : (
              state.receipts.map((r) => (
                <div className="tx-row" key={r.id}>
                  <div className="tx-ic">🧾</div>
                  <div className="tx-main"><b>{r.jobTitle}</b><span>SV nhận: {r.student} · {r.date}</span></div>
                  <div className="tx-amt pos">{fmtVND(r.total)}</div>
                </div>
              ))
            )}
          </div>

          <div className="pcard" style={{ border: '1px solid var(--lime)' }}>
            <h4>🛡️ Quỹ Bảo hiểm Tương hỗ Cộng đồng</h4>
            <p className="sub" style={{ marginTop: -6 }}>Trích 10% từ doanh thu Premium & Affiliate/Ads, dùng để bồi thường 30–50% giá trị công việc nếu bạn bị quỵt tiền.</p>
            <div className="wallet-balance-num" style={{ fontSize: 28, margin: '8px 0' }}>{fmtVND(state.insuranceFund)}</div>
            <div className="sub" style={{ marginBottom: 10 }}>Số dư quỹ hiện tại</div>
            <button className="btn btn-lime btn-block" onClick={() => openModal('claim')}>Gửi khiếu nại bồi thường</button>
            <h4 style={{ marginTop: 18 }}>Lịch sử khiếu nại của bạn</h4>
            {state.claims.length === 0 ? (
              <div className="empty-state">Bạn chưa gửi khiếu nại nào.</div>
            ) : (
              state.claims.map((c) => (
                <div className="tx-row" key={c.id}>
                  <div className="tx-ic">🛡️</div>
                  <div className="tx-main"><b>{c.jobTitle}</b><span>{c.desc}</span></div>
                  <div className="tx-amt pos">{fmtVND(c.payout)}</div>
                </div>
              ))
            )}
          </div>

          <div>
            <div className="pcard">
              <h4>Gói đăng ký</h4>
              <div style={{ marginBottom: 14 }}>
                {state.subscriptionPro && <div className="chip chip-lime" style={{ marginBottom: 8 }}>⭐ Freelance Pro — đang hoạt động</div>}
                {state.vipBusiness && <div className="chip chip-lime" style={{ marginBottom: 8 }}>👑 VIP Business Suite — đang hoạt động</div>}
                {!state.subscriptionPro && !state.vipBusiness && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Bạn đang dùng gói Free. Nâng cấp để mở khoá thêm đặc quyền.</p>
                )}
              </div>
              <button className="btn btn-outline btn-block" onClick={() => navigate('/pricing')}>Xem các gói</button>
            </div>
            <div className="pcard">
              <h4>Phương thức thanh toán</h4>
              <div className="paymethod is-active" style={{ cursor: 'default' }}>
                <div className="pm-ic">🏦</div>
                <div className="pm-main"><b>Chuyển khoản / QR ngân hàng</b><span>Liên kết mô phỏng demo</span></div>
              </div>
              <div className="paymethod" style={{ cursor: 'default' }}>
                <div className="pm-ic">📱</div>
                <div className="pm-main"><b>Ví MoMo / ZaloPay</b><span>Liên kết mô phỏng demo</span></div>
              </div>
              <div className="paymethod" style={{ cursor: 'default' }}>
                <div className="pm-ic">💳</div>
                <div className="pm-main"><b>Thẻ tín dụng / ghi nợ</b><span>Liên kết mô phỏng demo</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
