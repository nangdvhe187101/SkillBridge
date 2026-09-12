import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import { exportTransactionsToCSV } from '../../utils/fileDownloader';
import { getActivePendingOrder, cancelPendingOrder } from '../../api/paymentApi';
import Icon from '../../components/Icon';

const TX_CONFIG = {
  topup: { icon: 'arrow-down-left', label: 'Nạp tiền', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  withdraw: { icon: 'arrow-up-right', label: 'Rút tiền', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },
  escrow_release: { icon: 'check', label: 'Giải ngân', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  escrow_hold: { icon: 'lock', label: 'Ký quỹ Escrow', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  insurance_payout: { icon: 'shield-check', label: 'Bồi thường BH', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
  subscription: { icon: 'crown', label: 'Gói đặc quyền', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' },
  commission: { icon: 'receipt', label: 'Phí nền tảng', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  default: { icon: 'card', label: 'Giao dịch', color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.12)' },
};

const TX_FILTER_LIST = [
  { key: 'all', label: 'Tất cả', icon: null },
  { key: 'topup', label: 'Nạp tiền', icon: 'arrow-down-left' },
  { key: 'withdraw', label: 'Rút tiền', icon: 'arrow-up-right' },
  { key: 'escrow_release', label: 'Giải ngân', icon: 'check' },
  { key: 'escrow_hold', label: 'Ký quỹ Escrow', icon: 'lock' },
  { key: 'insurance_payout', label: 'Bồi thường BH', icon: 'shield-check' },
];

const VN_BANKS = [
  'MB Bank (Ngân hàng Quân Đội)',
  'Vietcombank (Ngân hàng Ngoại Thương)',
  'Techcombank (Ngân hàng Kỹ Thương)',
  'VPBank (Ngân hàng Việt Nam Thịnh Vượng)',
  'BIDV (Ngân hàng Đầu tư và Phát triển)',
  'VietinBank (Ngân hàng Công Thương)',
  'ACB (Ngân hàng Á Châu)',
  'TPBank (Ngân hàng Tiên Phong)',
  'HDBank (Ngân hàng Phát triển TP.HCM)',
  'Sacombank (Ngân hàng Sài Gòn Thương Tín)'
];

export default function Wallet() {
  const { state, updateBankAccount, showToast } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  // Pending payment order state (Resume pending payment)
  const [pendingOrder, setPendingOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(false);

  const loadPendingOrder = async () => {
    try {
      const res = await getActivePendingOrder();
      setPendingOrder(res || null);
    } catch {
      setPendingOrder(null);
    }
  };

  useEffect(() => {
    loadPendingOrder();
  }, [state.balance]);

  const handleCancelPending = async (orderCode) => {
    if (!orderCode || cancellingOrder) return;
    try {
      setCancellingOrder(true);
      await cancelPendingOrder(orderCode);
      setPendingOrder(null);
      if (typeof showToast === 'function') showToast('Đã hủy đơn nạp tiền đang chờ.', 'check');
    } catch (err) {
      if (typeof showToast === 'function') showToast(err?.message || 'Không thể hủy đơn.', 'x');
    } finally {
      setCancellingOrder(false);
    }
  };

  // Transaction filter & pagination state
  const [txFilter, setTxFilter] = useState('all');
  const [txPage, setTxPage] = useState(1);
  const txPageSize = 5;

  // Modals state
  const [receiptModal, setReceiptModal] = useState(null); // Receipt object
  const [claimModal, setClaimModal] = useState(null); // Claim object
  const [bankModalOpen, setBankModalOpen] = useState(false);

  // Bank form state
  const [bankForm, setBankForm] = useState(state.bankAccount || {
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    accountNumber: '999988886666',
    accountHolder: 'NGUYEN VAN A',
    branch: 'Chi nhánh Hà Nội'
  });

  useEffect(() => {
    setTxPage(1);
  }, [txFilter]);

  const filteredTransactions = useMemo(() => {
    if (txFilter === 'all') return state.transactions;
    return state.transactions.filter((t) => t.type === txFilter);
  }, [state.transactions, txFilter]);

  const totalTxPages = Math.ceil(filteredTransactions.length / txPageSize) || 1;
  const pagedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage]);

  const handleSaveBank = (e) => {
    e.preventDefault();
    if (!bankForm.accountNumber || !bankForm.accountHolder) {
      alert('Vui lòng nhập đầy đủ Số tài khoản và Tên chủ tài khoản.');
      return;
    }
    updateBankAccount({
      ...bankForm,
      accountHolder: bankForm.accountHolder.toUpperCase().trim()
    });
    setBankModalOpen(false);
  };

  const handleDownloadReceipt = (r) => {
    const content = `=====================================================
BIÊN NHẬN ĐIỆN TỬ - SKILLBRIDGE ESCROW SETTLEMENT
=====================================================
Mã biên nhận: ${r.code || 'SB-REC-2026'}
Ngày giải ngân: ${r.date}
Trạng thái: THÀNH CÔNG (ĐÃ GIẢI NGÂN)

THÔNG TIN GIAO DỊCH:
- Tên công việc: ${r.jobTitle}
- Đơn vị chi trả (NTD): ${r.employer || 'Nhà tuyển dụng'}
- Người thụ hưởng (Sinh viên): ${r.student || 'Sinh viên'}

CHI TIẾT TÀI CHÍNH:
- Tổng số tiền hợp đồng: ${fmtVND(r.total)}
- Phí nền tảng SkillBridge: ${r.commission > 0 ? fmtVND(r.commission) : '0đ (Miễn phí 100%)'}
- Thuế TNCN (khấu trừ tại nguồn): 0đ
-----------------------------------------------------
SỐ TIỀN THỰC NHẬN VÀO VÍ: ${fmtVND(r.net || (r.total - (r.commission || 0)))}
=====================================================
Căn cứ xác thực điện tử bởi Hệ thống Ký quỹ SkillBridge
Hotline CSKH: 1900-8888 | Email: support@skillbridge.vn
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BienNhan_${r.code || 'SkillBridge'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const escrowLockedAmount = state.escrowLocked || 0;
  const totalAssets = state.balance + escrowLockedAmount;

  return (
    <div className="page active">
      {/* 3-Metric Financial Hero Header */}
      <div className="wallet-hero">
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Card 1: Available Balance */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: 18,
                padding: '20px 24px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Số dư khả dụng (Có thể rút ngay)
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: '#CBFF4D' }}>
                {fmtVND(state.balance)}
              </div>
            </div>

            {/* Card 2: Escrow Locked Balance */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03))',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 18,
                padding: '20px 24px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" width="13" height="13" />
                Đang tạm giữ Ký quỹ (Escrow)
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: '#57C7FF' }}>
                {fmtVND(escrowLockedAmount)}
              </div>
            </div>

            {/* Card 3: Total Assets */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(108, 76, 255, 0.35), rgba(6, 182, 212, 0.2))',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 18,
                padding: '20px 24px',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="gem" width="16" height="16" />
                  <span>Tổng tài sản ví SkillBridge</span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: '#fff' }}>
                  {fmtVND(totalAssets)}
                </div>
              </div>
              <div className="wallet-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-lime btn-sm" onClick={() => openModal('topup', pendingOrder ? { initialOrder: pendingOrder } : {})}>+ Nạp tiền</button>
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => openModal('withdraw')}>Rút tiền</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wallet-body wrap">
        {/* Pending Payment Order Banner (Resume pending transaction - Cách 2) */}
        {pendingOrder && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(99, 102, 241, 0.08))',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Icon name="hourglass" width="22" height="22" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)' }}>
                    Bạn có một giao dịch nạp tiền đang chờ quét mã
                  </span>
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#b45309',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999
                    }}
                  >
                    Đang chờ
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>Số tiền: <b style={{ color: 'var(--primary)', fontWeight: 700 }}>{fmtVND(pendingOrder.amount)}</b></span>
                  <span>•</span>
                  <span>Mã đơn: <code>{pendingOrder.orderCode}</code></span>
                  <span>•</span>
                  <span>Phương thức: <b>VietQR</b></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn btn-sm btn-outline"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                disabled={cancellingOrder}
                onClick={() => handleCancelPending(pendingOrder.orderCode)}
              >
                <Icon name="x" width="13" height="13" />
                <span>{cancellingOrder ? 'Đang hủy...' : 'Hủy đơn'}</span>
              </button>
              <button
                className="btn btn-sm btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)' }}
                onClick={() => openModal('topup', { initialOrder: pendingOrder })}
              >
                <Icon name="qr" width="15" height="15" />
                <span>Tiếp tục quét mã QR</span>
                <Icon name="arrow" width="13" height="13" />
              </button>
            </div>
          </div>
        )}

        <div className="wallet-grid">
          {/* Left Column: Transaction History & E-Receipts */}
          <div>
            {/* Transaction History Card with Filters & Pagination */}
            <div className="pcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="chart-bar" width="18" height="18" style={{ color: 'var(--primary)' }} />
                  <span>Lịch sử giao dịch</span>
                </h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11.5, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => exportTransactionsToCSV(filteredTransactions, `Sao_ke_vi_${state.currentUser?.fullName || 'User'}.csv`)}
                    title="Xuất danh sách giao dịch ra file Excel/CSV"
                  >
                    <Icon name="download" width="13" height="13" />
                    <span>Xuất Excel/CSV</span>
                  </button>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    Tổng: <b>{filteredTransactions.length}</b> mục
                  </span>
                </div>
              </div>

              {/* Transaction Filter Chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
                {TX_FILTER_LIST.map((item) => (
                  <button
                    key={item.key}
                    className={'chip ' + (txFilter === item.key ? 'is-active' : '')}
                    onClick={() => setTxFilter(item.key)}
                    style={{ fontSize: 12, padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {item.icon && <Icon name={item.icon} width="13" height="13" />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">Không có giao dịch nào thuộc bộ lọc này.</div>
              ) : (
                pagedTransactions.map((t) => {
                  const cfg = TX_CONFIG[t.type] || TX_CONFIG.default;
                  return (
                    <div className="tx-row" key={t.id}>
                      <div className="tx-ic" style={{ background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={cfg.icon} width="17" height="17" />
                      </div>
                      <div className="tx-main">
                        <b>{t.label}</b>
                        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.date}</span>
                      </div>
                      <div className={'tx-amt' + (t.sign > 0 ? ' pos' : ' neg')} style={{ fontWeight: 700, fontSize: 14 }}>
                        {t.sign > 0 ? '+' : '-'}{fmtVND(t.amount)}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Reusable Pagination Component */}
              <Pagination
                currentPage={txPage}
                totalPages={totalTxPages}
                totalItems={filteredTransactions.length}
                pageSize={txPageSize}
                onPageChange={setTxPage}
                itemLabel="giao dịch"
              />
            </div>

            {/* E-Receipts Card */}
            <div className="pcard" style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="receipt" width="18" height="18" style={{ color: 'var(--primary)' }} />
                  <span>Biên nhận điện tử (E-Receipts)</span>
                </h4>
              </div>
              <p className="sub" style={{ marginTop: 0, marginBottom: 14 }}>
                Biên nhận được tạo tự động sau mỗi lần giải ngân — dùng làm chứng từ minh bạch thu nhập. Bấm vào để xem chi tiết hoặc tải về máy.
              </p>

              {state.receipts.length === 0 ? (
                <div className="empty-state">Chưa có biên nhận nào.</div>
              ) : (
                state.receipts.map((r) => (
                  <div
                    className="tx-row"
                    key={r.id}
                    style={{ cursor: 'pointer', transition: 'background 0.15s ease', borderRadius: 8, padding: '10px 8px' }}
                    onClick={() => setReceiptModal(r)}
                    title="Bấm để xem và tải biên nhận"
                  >
                    <div className="tx-ic" style={{ background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="receipt" width="17" height="17" />
                    </div>
                    <div className="tx-main">
                      <b>{r.jobTitle}</b>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                        Mã: <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{r.code || 'SB-REC'}</code> · {r.date}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tx-amt pos" style={{ fontWeight: 700 }}>{fmtVND(r.total)}</div>
                      <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Xem & Tải →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Bank Account, Insurance Fund, Subscriptions */}
          <div>
            {/* Linked Payout Bank Account Manager Card */}
            <div className="pcard" style={{ border: '1px solid rgba(108, 76, 255, 0.25)', background: 'linear-gradient(to bottom, var(--surface), rgba(108, 76, 255, 0.03))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="bank" width="18" height="18" style={{ color: 'var(--primary)' }} />
                  <span>Tài khoản Ngân hàng nhận tiền</span>
                </h4>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setBankModalOpen(true)}
                >
                  <Icon name="edit" width="12" height="12" />
                  <span>Thay đổi</span>
                </button>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  color: '#fff',
                  borderRadius: 14,
                  padding: '16px 18px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', right: 12, top: 12, opacity: 0.12, color: '#fff' }}>
                  <Icon name="card" width="56" height="56" />
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {state.bankAccount?.bankName || 'MB Bank'}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, margin: '10px 0', letterSpacing: 2, color: '#CBFF4D' }}>
                  {state.bankAccount?.accountNumber || '9999 8888 6666'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 12 }}>
                  <div>
                    <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>CHỦ TÀI KHOẢN</span>
                    <b style={{ textTransform: 'uppercase' }}>{state.bankAccount?.accountHolder || 'NGUYEN VAN A'}</b>
                  </div>
                  <span style={{ fontSize: 11, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="check" width="11" height="11" />
                    <span>Đã liên kết</span>
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 0 }}>
                Tiền rút sẽ được chuyển trực tiếp vào tài khoản này trong vòng 5–15 phút sau khi duyệt.
              </p>
            </div>

            {/* Community Insurance Fund Card & Claims Tracker */}
            <div className="pcard" style={{ border: '1px solid var(--lime)', marginTop: 22 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="shield-check" width="18" height="18" style={{ color: 'var(--primary)' }} />
                <span>Quỹ Bảo hiểm Tương hỗ</span>
              </h4>
              <p className="sub" style={{ marginTop: -6 }}>
                Trích từ doanh thu nền tảng, dùng để hỗ trợ bồi thường nếu phát sinh rủi ro trong quá trình làm việc.
              </p>
              <div className="wallet-balance-num" style={{ fontSize: 28, margin: '8px 0', color: 'var(--primary)' }}>
                {fmtVND(state.insuranceFund)}
              </div>
              <div className="sub" style={{ marginBottom: 12 }}>Số dư quỹ an toàn hiện tại</div>
              <button className="btn btn-lime btn-block" onClick={() => openModal('claim')}>
                Gửi khiếu nại bồi thường
              </button>

              <h4 style={{ marginTop: 20, marginBottom: 10 }}>Hồ sơ khiếu nại của bạn</h4>
              {state.claims.length === 0 ? (
                <div className="empty-state">Bạn chưa gửi khiếu nại nào.</div>
              ) : (
                state.claims.map((c) => (
                  <div
                    className="tx-row"
                    key={c.id}
                    style={{ cursor: 'pointer', borderRadius: 8, padding: '8px' }}
                    onClick={() => setClaimModal(c)}
                    title="Bấm để xem tiến độ khiếu nại"
                  >
                    <div className="tx-ic" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="shield-check" width="17" height="17" />
                    </div>
                    <div className="tx-main">
                      <b>{c.jobTitle}</b>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{c.desc}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        className="chip"
                        style={{
                          fontSize: 11,
                          background: c.status === 'approved' || c.status === 'resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                          color: c.status === 'approved' || c.status === 'resolved' ? '#16a34a' : '#d97706'
                        }}
                      >
                        {c.statusLabel || (c.status === 'approved' ? 'Đã bồi thường' : 'Chờ duyệt')}
                      </span>
                      {c.payout > 0 && <div className="tx-amt pos" style={{ fontSize: 12, marginTop: 2 }}>+{fmtVND(c.payout)}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Subscriptions Card */}
            <div className="pcard" style={{ marginTop: 22 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="crown" width="18" height="18" style={{ color: '#eab308' }} />
                <span>Gói đặc quyền & Đăng ký</span>
              </h4>
              <div style={{ marginBottom: 14 }}>
                {state.subscriptionPro && (
                  <div className="chip chip-lime" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="star" width="13" height="13" />
                    <span>Freelance Pro — đang hoạt động</span>
                  </div>
                )}
                {state.vipBusiness && (
                  <div className="chip chip-lime" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="crown" width="13" height="13" />
                    <span>VIP Business Suite — đang hoạt động</span>
                  </div>
                )}
                {!state.subscriptionPro && !state.vipBusiness && (
                  <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Bạn đang dùng gói Miễn phí. Nâng cấp để mở khoá huy hiệu uy tín và giảm phí giao dịch.</p>
                )}
              </div>
              <button className="btn btn-outline btn-block" onClick={() => navigate('/pricing')}>Xem các gói đặc quyền →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Digital E-Receipt Detail & Downloader */}
      {receiptModal && (
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
          onClick={() => setReceiptModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 18,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="receipt" width="22" height="22" style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>Biên nhận điện tử hợp lệ</h3>
              </div>
              <button onClick={() => setReceiptModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center' }}>
                <Icon name="x" width="16" height="16" />
              </button>
            </div>

            <div style={{ background: 'rgba(108, 76, 255, 0.05)', border: '1px dashed var(--primary)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Mã chứng từ:</span>
                <b><code style={{ color: 'var(--primary)' }}>{receiptModal.code || 'SB-REC-2026'}</code></b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Ngày giải ngân:</span>
                <b>{receiptModal.date}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Trạng thái:</span>
                <span className="chip" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="check" width="11" height="11" />
                  <span>ĐÃ GIẢI NGÂN</span>
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Công việc:</span> <b>{receiptModal.jobTitle}</b>
              </div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Người chi trả (NTD):</span> <b>{receiptModal.employer || 'Nhà tuyển dụng'}</b>
              </div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-soft)' }}>Người thụ hưởng (SV):</span> <b>{receiptModal.student || 'Sinh viên'}</b>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span>Giá trị hợp đồng:</span>
                <span>{fmtVND(receiptModal.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: receiptModal.commission > 0 ? '#ea580c' : '#16a34a' }}>
                <span>Phí nền tảng SkillBridge:</span>
                <b>{receiptModal.commission > 0 ? fmtVND(receiptModal.commission) : '0đ (Miễn phí)'}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 15, fontWeight: 700 }}>
                <span>Thực nhận vào ví:</span>
                <span style={{ color: 'var(--primary)', fontSize: 18 }}>{fmtVND(receiptModal.net || (receiptModal.total - (receiptModal.commission || 0)))}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setReceiptModal(null)}>Đóng</button>
              <button className="btn btn-primary btn-sm" onClick={() => handleDownloadReceipt(receiptModal)}>
                Tải biên nhận (.txt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Claim Dossier Viewer */}
      {claimModal && (
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
          onClick={() => setClaimModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 18,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="shield-check" width="22" height="22" style={{ color: '#06b6d4' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>Hồ sơ Khiếu nại Quỹ Bảo hiểm</h3>
              </div>
              <button onClick={() => setClaimModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--ink-soft)' }}>
                <Icon name="x" width="16" height="16" />
              </button>
            </div>

            <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 }}>
              <p><b>Công việc khiếu nại:</b> {claimModal.jobTitle}</p>
              <p><b>Lý do / Bằng chứng:</b> {claimModal.desc}</p>
              <p><b>Ngày nộp:</b> {claimModal.date}</p>
              <p>
                <b>Trạng thái giải quyết:</b>{' '}
                <span
                  className="chip"
                  style={{
                    background: claimModal.status === 'approved' || claimModal.status === 'resolved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                    color: claimModal.status === 'approved' || claimModal.status === 'resolved' ? '#16a34a' : '#d97706',
                    fontSize: 12
                  }}
                >
                  {claimModal.statusLabel || (claimModal.status === 'approved' ? 'Đã duyệt chi trả' : 'Đang thẩm định')}
                </span>
              </p>
              {claimModal.payout > 0 && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(34, 197, 94, 0.08)', borderRadius: 10, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Số tiền Quỹ Bảo hiểm đã bồi thường vào ví:</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>+{fmtVND(claimModal.payout)}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setClaimModal(null)}>Đã hiểu</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Bank Account Editor */}
      {bankModalOpen && (
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
          onClick={() => setBankModalOpen(false)}
        >
          <form
            onSubmit={handleSaveBank}
            style={{
              background: 'var(--surface)',
              borderRadius: 18,
              maxWidth: 460,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="bank" width="18" height="18" style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>Cập nhật Tài khoản Ngân hàng Rút tiền</h3>
              </div>
              <button type="button" onClick={() => setBankModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--ink-soft)' }}>
                <Icon name="x" width="16" height="16" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ngân hàng thụ hưởng:</label>
                <select
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
                >
                  {VN_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Số tài khoản ngân hàng:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tên chủ tài khoản (In hoa không dấu):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: NGUYEN VAN A"
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Chi nhánh (Tùy chọn):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chi nhánh Hà Nội"
                  value={bankForm.branch || ''}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setBankModalOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary btn-sm">Lưu thông tin TKNH</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
