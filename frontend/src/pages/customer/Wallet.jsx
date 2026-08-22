import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, fmtVND, TX_ICON } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import { downloadJobAttachment, exportTransactionsToCSV } from '../../utils/fileDownloader';

const TX_FILTER_MAP = {
  all: 'Tất cả',
  topup: '💰 Nạp tiền',
  withdraw: '🏦 Rút tiền',
  escrow_release: '💼 Giải ngân',
  escrow_hold: '🔒 Ký quỹ Escrow',
  insurance_payout: '🛡️ Bồi thường BH',
};

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
  const { state, updateBankAccount } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

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
- Phí nền tảng SkillBridge: 0đ (Miễn phí 100%)
- Thuế TNCN (khấu trừ tại nguồn): 0đ
-----------------------------------------------------
SỐ TIỀN THỰC NHẬN VÀO VÍ: ${fmtVND(r.net || r.total)}
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

  const escrowLockedAmount = state.escrowLocked || 250000;
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
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>🟢 Số dư khả dụng (Có thể rút ngay)</div>
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
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>🔒 Đang tạm giữ Ký quỹ (Escrow)</div>
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
                <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>💎 Tổng tài sản ví SkillBridge</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, color: '#fff' }}>
                  {fmtVND(totalAssets)}
                </div>
              </div>
              <div className="wallet-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-lime btn-sm" onClick={() => openModal('topup')}>+ Nạp tiền</button>
                <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} onClick={() => openModal('withdraw')}>Rút tiền</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wallet-body wrap">
        <div className="wallet-grid">
          {/* Left Column: Transaction History & E-Receipts */}
          <div>
            {/* Transaction History Card with Filters & Pagination */}
            <div className="pcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <h4 style={{ margin: 0 }}>📊 Lịch sử giao dịch</h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11.5, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => exportTransactionsToCSV(filteredTransactions, `Sao_ke_vi_${state.currentUser?.fullName || 'User'}.csv`)}
                    title="Xuất danh sách giao dịch ra file Excel/CSV"
                  >
                    📥 Xuất Excel/CSV
                  </button>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    Tổng: <b>{filteredTransactions.length}</b> mục
                  </span>
                </div>
              </div>

              {/* Transaction Filter Chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
                {Object.entries(TX_FILTER_MAP).map(([key, label]) => (
                  <button
                    key={key}
                    className={'chip ' + (txFilter === key ? 'is-active' : '')}
                    onClick={() => setTxFilter(key)}
                    style={{ fontSize: 12, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Transactions List */}
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">Không có giao dịch nào thuộc bộ lọc này.</div>
              ) : (
                pagedTransactions.map((t) => (
                  <div className="tx-row" key={t.id}>
                    <div className="tx-ic">{TX_ICON[t.type] || '💳'}</div>
                    <div className="tx-main">
                      <b>{t.label}</b>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.date}</span>
                    </div>
                    <div className={'tx-amt' + (t.sign > 0 ? ' pos' : ' neg')} style={{ fontWeight: 700, fontSize: 14 }}>
                      {t.sign > 0 ? '+' : '-'}{fmtVND(t.amount)}
                    </div>
                  </div>
                ))
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
                <h4 style={{ margin: 0 }}>🧾 Biên nhận điện tử (E-Receipts)</h4>
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
                    <div className="tx-ic" style={{ background: 'rgba(108, 76, 255, 0.1)', color: 'var(--primary)' }}>🧾</div>
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
                <h4 style={{ margin: 0 }}>🏦 Tài khoản Ngân hàng nhận tiền</h4>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: 11.5, padding: '3px 8px' }}
                  onClick={() => setBankModalOpen(true)}
                >
                  ✏️ Thay đổi
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
                <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 72, opacity: 0.08 }}>💳</div>
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
                  <span style={{ fontSize: 11, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 6px', borderRadius: 4 }}>
                    ✓ Đã liên kết
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 0 }}>
                💡 Tiền rút sẽ được chuyển trực tiếp vào tài khoản này trong vòng 5–15 phút sau khi duyệt.
              </p>
            </div>

            {/* Community Insurance Fund Card & Claims Tracker */}
            <div className="pcard" style={{ border: '1px solid var(--lime)', marginTop: 22 }}>
              <h4>🛡️ Quỹ Bảo hiểm Tương hỗ Cộng đồng</h4>
              <p className="sub" style={{ marginTop: -6 }}>
                Trích 10% từ doanh thu Premium & Ads, dùng để bồi thường 30–50% giá trị công việc nếu bạn gặp rủi ro bị quỵt tiền.
              </p>
              <div className="wallet-balance-num" style={{ fontSize: 28, margin: '8px 0', color: 'var(--primary)' }}>
                {fmtVND(state.insuranceFund)}
              </div>
              <div className="sub" style={{ marginBottom: 12 }}>Số dư quỹ an toàn hiện tại</div>
              <button className="btn btn-lime btn-block" onClick={() => openModal('claim')}>
                🛡️ Gửi khiếu nại bồi thường
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
                    <div className="tx-ic">🛡️</div>
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
                        {c.statusLabel || (c.status === 'approved' ? '✅ Đã bồi thường' : '⏳ Chờ duyệt')}
                      </span>
                      {c.payout > 0 && <div className="tx-amt pos" style={{ fontSize: 12, marginTop: 2 }}>+{fmtVND(c.payout)}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Subscriptions Card */}
            <div className="pcard" style={{ marginTop: 22 }}>
              <h4>Gói đặc quyền & Đăng ký</h4>
              <div style={{ marginBottom: 14 }}>
                {state.subscriptionPro && <div className="chip chip-lime" style={{ marginBottom: 8 }}>⭐ Freelance Pro — đang hoạt động</div>}
                {state.vipBusiness && <div className="chip chip-lime" style={{ marginBottom: 8 }}>👑 VIP Business Suite — đang hoạt động</div>}
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
                <span style={{ fontSize: 22 }}>🧾</span>
                <h3 style={{ margin: 0, fontSize: 18 }}>Biên nhận điện tử hợp lệ</h3>
              </div>
              <button onClick={() => setReceiptModal(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink-soft)' }}>✕</button>
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
                <span className="chip" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', fontSize: 11 }}>✓ ĐÃ GIẢI NGÂN</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#16a34a' }}>
                <span>Phí nền tảng SkillBridge:</span>
                <b>0đ (Miễn phí)</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 15, fontWeight: 700 }}>
                <span>Thực nhận vào ví:</span>
                <span style={{ color: 'var(--primary)', fontSize: 18 }}>{fmtVND(receiptModal.net || receiptModal.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setReceiptModal(null)}>Đóng</button>
              <button className="btn btn-primary btn-sm" onClick={() => handleDownloadReceipt(receiptModal)}>
                ⬇ Tải biên nhận về máy (.txt)
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
                <span style={{ fontSize: 22 }}>🛡️</span>
                <h3 style={{ margin: 0, fontSize: 18 }}>Hồ sơ Khiếu nại Quỹ Bảo hiểm</h3>
              </div>
              <button onClick={() => setClaimModal(null)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
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
                  {claimModal.statusLabel || (claimModal.status === 'approved' ? '✅ Đã duyệt chi trả' : '⏳ Đang thẩm định')}
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
              <h3 style={{ margin: 0, fontSize: 18 }}>🏦 Cập nhật Tài khoản Ngân hàng Rút tiền</h3>
              <button type="button" onClick={() => setBankModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>✕</button>
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
