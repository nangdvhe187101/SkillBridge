import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import Pagination from '../../components/Pagination';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../../utils/fileDownloader';
import { printReceipt, downloadReceiptTxt } from '../../utils/receiptExporter';
import { getActivePendingOrder, cancelPendingOrder } from '../../api/paymentApi';
import {
  createBankVerificationRequest,
  decodeBankQr,
  cancelBankVerificationRequest,
  getCurrentBankVerification
} from '../../api/walletApi';
import Icon from '../../components/Icon';

const TX_CONFIG = {
  topup: { icon: 'arrow-down-left', label: 'Nạp tiền', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  withdraw: { icon: 'arrow-up-right', label: 'Rút tiền', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },
  withdraw_hold: { icon: 'arrow-up-right', label: 'Rút tiền', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },
  withdraw_refund: { icon: 'arrow-down-left', label: 'Hoàn tiền rút', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)' },
  withdraw_fee: { icon: 'receipt', label: 'Phí rút tiền', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  escrow_release: { icon: 'check', label: 'Giải ngân', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  escrow_hold: { icon: 'lock', label: 'Ký quỹ Escrow', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  escrow_refund: { icon: 'arrow-down-left', label: 'Hoàn tiền ký quỹ', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  insurance_payout: { icon: 'shield-check', label: 'Bồi thường BH', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
  subscription: { icon: 'crown', label: 'Gói đặc quyền', color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' },
  commission: { icon: 'receipt', label: 'Phí nền tảng', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
  default: { icon: 'card', label: 'Giao dịch', color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.12)' },
};

import { VIETNAM_BANKS } from '../../constants/banks';
import { removeVietnameseTones } from '../../services/vietqrService';

export default function Wallet() {
  const { state, updateBankAccount, showToast, refreshWallet } = useStore();
  const { openModal } = useModal();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof refreshWallet === 'function') {
      refreshWallet();
    }
  }, [refreshWallet]);

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

  // Bank Verification State
  const [verificationReq, setVerificationReq] = useState(null);
  const [qrDecoding, setQrDecoding] = useState(false);
  const qrFileInputRef = useRef(null);

  const loadVerificationStatus = async () => {
    try {
      const res = await getCurrentBankVerification();
      setVerificationReq(res || null);
    } catch {
      setVerificationReq(null);
    }
  };

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const userFullName = state.currentUser?.fullName || state.profile?.fullName || 'NGUYEN VAN A';
  const lockedHolderName = useMemo(() => removeVietnameseTones(userFullName), [userFullName]);

  // Bank form state
  const [bankForm, setBankForm] = useState(() => state.bankAccount || {
    bankBin: '970422',
    bankName: 'MB Bank',
    accountNumber: '',
    accountHolder: lockedHolderName,
    branch: ''
  });

  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (state.bankAccount) {
      setBankForm(state.bankAccount);
    } else {
      setBankForm((prev) => ({
        ...prev,
        accountHolder: prev.accountHolder || lockedHolderName
      }));
    }
  }, [state.bankAccount, lockedHolderName]);

  const isEmployer = state.role === 'employer' || state.currentUser?.roleCode === 'employer';

  const txFilterList = useMemo(() => {
    if (isEmployer) {
      return [
        { key: 'all', label: 'Tất cả', icon: null },
        { key: 'topup', label: 'Nạp tiền', icon: 'arrow-down-left' },
        { key: 'withdraw', label: 'Rút tiền', icon: 'arrow-up-right' },
        { key: 'escrow_hold', label: 'Ký quỹ Escrow', icon: 'lock' },
        { key: 'escrow_refund', label: 'Hoàn tiền ký quỹ', icon: 'arrow-down-left' },
        { key: 'subscription', label: 'Gói VIP / Thuê bao', icon: 'crown' },
        { key: 'insurance_payout', label: 'Bồi thường BH', icon: 'shield-check' },
      ];
    }
    return [
      { key: 'all', label: 'Tất cả', icon: null },
      { key: 'escrow_release', label: 'Nhận thù lao', icon: 'check' },
      { key: 'commission', label: 'Phí bảo trợ sàn', icon: 'receipt' },
      { key: 'withdraw', label: 'Rút tiền', icon: 'arrow-up-right' },
      { key: 'topup', label: 'Nạp tiền', icon: 'arrow-down-left' },
      { key: 'subscription', label: 'Gói Pro / Master', icon: 'crown' },
      { key: 'insurance_payout', label: 'Bồi thường BH', icon: 'shield-check' },
    ];
  }, [isEmployer]);

  const filteredTransactions = useMemo(() => {
    let list = state.transactions || [];
    // Với Nhà tuyển dụng: Nghiệm thu không bao giờ có phí sàn, lọc sạch dòng commission nếu có tàn dư
    if (isEmployer) {
      list = list.filter((t) => t.type !== 'commission');
    }
    if (txFilter === 'all') return list;
    if (txFilter === 'withdraw') {
      return list.filter((t) => t.type === 'withdraw' || t.type === 'withdraw_hold' || t.type === 'withdraw_refund' || t.type === 'withdraw_fee');
    }
    return list.filter((t) => t.type === txFilter);
  }, [state.transactions, txFilter, isEmployer]);

  const totalTxPages = Math.ceil(filteredTransactions.length / txPageSize) || 1;
  const pagedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return filteredTransactions.slice(start, start + txPageSize);
  }, [filteredTransactions, txPage]);

  // Quản lý menu dropdown xuất sao kê (Excel/CSV)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format = 'xlsx') => {
    setExportDropdownOpen(false);
    if (!filteredTransactions || filteredTransactions.length === 0) {
      if (typeof showToast === 'function') showToast('Không có giao dịch nào để xuất sao kê.', 'warning');
      return;
    }
    const metadata = {
      user: state.currentUser,
      balance: state.balance,
      escrowLocked: state.escrowLocked,
      bankAccount: state.bankAccount,
      filterLabel: txFilterList.find((f) => f.key === txFilter)?.label || 'Tất cả danh mục'
    };

    if (format === 'csv') {
      exportTransactionsToCSV(filteredTransactions, metadata);
      if (typeof showToast === 'function') showToast('Đã tải file CSV sao kê giao dịch thành công!', 'check');
    } else {
      exportTransactionsToExcel(filteredTransactions, metadata);
      if (typeof showToast === 'function') showToast('Đã tải file Excel (.xlsx) sao kê giao dịch thành công!', 'check');
    }
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!bankForm.accountNumber || !bankForm.accountNumber.trim()) {
      showToast('Vui lòng nhập số tài khoản ngân hàng.', 'warning');
      return;
    }
    setSavingBank(true);
    try {
      await createBankVerificationRequest({
        bankName: bankForm.bankName,
        bankCode: bankForm.bankBin,
        accountNumber: bankForm.accountNumber.trim()
      });
      setBankModalOpen(false);
      await loadVerificationStatus();
      showToast('Đã gửi yêu cầu xác thực ngân hàng thành công! Đang chờ Admin duyệt đối soát tên chính chủ.', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể gửi yêu cầu xác thực.', 'x');
    } finally {
      setSavingBank(false);
    }
  };

  const handleCancelVerification = async (reqId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu xác thực ngân hàng đang chờ duyệt này?')) return;
    try {
      await cancelBankVerificationRequest(reqId);
      await loadVerificationStatus();
      showToast('Đã hủy yêu cầu xác thực thành công.', 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể hủy yêu cầu.', 'x');
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrDecoding(true);
    try {
      const res = await decodeBankQr(file);
      if (res?.accountNumber) {
        setBankForm((prev) => ({
          ...prev,
          bankBin: res.bankCode || prev.bankBin,
          accountNumber: res.accountNumber,
          bankName: VIETNAM_BANKS.find((b) => b.bin === res.bankCode)?.name || prev.bankName
        }));
        showToast('Đã trích xuất số tài khoản từ mã QR thành công! Vui lòng kiểm tra lại.', 'check');
      }
    } catch (err) {
      showToast(err?.message || 'Không thể đọc mã QR từ ảnh tải lên. Vui lòng thử ảnh khác hoặc nhập tay.', 'x');
    } finally {
      setQrDecoding(false);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
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
                  <div style={{ position: 'relative' }} ref={exportRef}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{
                        fontSize: 12,
                        padding: '5px 12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 600,
                        borderRadius: 8,
                        borderColor: exportDropdownOpen ? 'var(--primary)' : 'var(--border)'
                      }}
                      onClick={() => setExportDropdownOpen((prev) => !prev)}
                      title="Tải bảng sao kê lịch sử giao dịch (Excel .xlsx hoặc CSV)"
                    >
                      <Icon name="download" width="13" height="13" style={{ color: 'var(--primary)' }} />
                      <span>Xuất sao kê giao dịch</span>
                      <Icon
                        name="chevdown"
                        width="11"
                        height="11"
                        style={{
                          transition: 'transform 0.2s ease',
                          transform: exportDropdownOpen ? 'rotate(180deg)' : 'none',
                          color: 'var(--ink-soft)'
                        }}
                      />
                    </button>

                    {exportDropdownOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 'calc(100% + 6px)',
                          zIndex: 60,
                          background: 'var(--bg-card, #ffffff)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)',
                          width: 310,
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink)' }}>Chọn định dạng sao kê</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>
                            Bao gồm {filteredTransactions.length} giao dịch theo bộ lọc hiện tại
                          </div>
                        </div>

                        {/* Option 1: Excel .xlsx */}
                        <button
                          type="button"
                          onClick={() => handleExport('xlsx')}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '9px 10px',
                            border: 'none',
                            borderRadius: 8,
                            background: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                            color: 'inherit'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: 14,
                              fontWeight: 800
                            }}
                          >
                            📊
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Tải file Excel (.xlsx)</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 99,
                                  background: 'rgba(16, 185, 129, 0.18)',
                                  color: '#059669'
                                }}
                              >
                                Khuyên dùng
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.35 }}>
                              Căn chỉnh cột tự động, định dạng tiền tệ VNĐ, kèm sheet phân loại dòng tiền
                            </div>
                          </div>
                        </button>

                        {/* Option 2: CSV .csv */}
                        <button
                          type="button"
                          onClick={() => handleExport('csv')}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '9px 10px',
                            border: 'none',
                            borderRadius: 8,
                            background: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                            color: 'inherit'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: 14,
                              fontWeight: 800
                            }}
                          >
                            📄
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Tải file CSV (.csv)</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.35 }}>
                              Định dạng bảng phân cách UTF-8 chuẩn, có header sao kê, phù hợp phần mềm kế toán
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    Tổng: <b>{filteredTransactions.length}</b> mục
                  </span>
                </div>

              </div>

              {/* Transaction Filter Chips */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
                {txFilterList.map((item) => (
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
                {(!verificationReq || verificationReq.status !== 'pending') && (
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: 11.5, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    onClick={() => {
                      setBankForm({
                        bankBin: state.bankAccount?.bankBin || '970422',
                        bankName: state.bankAccount?.bankName || 'MB Bank',
                        accountNumber: '',
                        accountHolder: lockedHolderName,
                        branch: ''
                      });
                      setBankModalOpen(true);
                    }}
                  >
                    <Icon name="edit" width="12" height="12" />
                    <span>{state.bankAccount?.isBankVerified ? 'Thay đổi' : 'Liên kết'}</span>
                  </button>
                )}
              </div>

              {/* TRƯỜNG HỢP 1: ĐANG CÓ YÊU CẦU CHỜ ADMIN DUYỆT (PENDING) */}
              {verificationReq && verificationReq.status === 'pending' ? (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1px solid #f59e0b',
                    color: '#fff',
                    borderRadius: 14,
                    padding: '16px 18px',
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fcd34d',
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                      Đang chờ Admin duyệt
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.4)', fontSize: 11, padding: '2px 8px' }}
                      onClick={() => handleCancelVerification(verificationReq.id)}
                    >
                      Hủy yêu cầu
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {verificationReq.bankName}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, margin: '8px 0', letterSpacing: 2, color: '#fde047' }}>
                    {verificationReq.accountNumberMask}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>
                    CHỦ TÀI KHOẢN: <b style={{ textTransform: 'uppercase' }}>{lockedHolderName}</b>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                    ⏳ Admin đang kiểm tra tên chính chủ qua App ngân hàng. Quá trình duyệt tay thường mất từ 5-15 phút.
                  </div>
                </div>
              ) : verificationReq && verificationReq.status === 'rejected' && (!state.bankAccount || !state.bankAccount.isBankVerified) ? (
                /* TRƯỜNG HỢP 2: BỊ TỪ CHỐI DUYỆT */
                <div
                  style={{
                    border: '1px solid #ef4444',
                    borderRadius: 14,
                    padding: '16px 18px',
                    background: 'rgba(239, 68, 68, 0.05)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: '#ef4444', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
                    <Icon name="alert-circle" width="30" height="30" />
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 14, color: '#dc2626' }}>Yêu cầu xác thực bị từ chối</h4>
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 10px' }}>
                    Lý do: <b>{verificationReq.rejectionReason || 'Tên tài khoản không trùng khớp tên hồ sơ.'}</b>
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      setBankForm({
                        bankBin: '970422',
                        bankName: 'MB Bank',
                        accountNumber: '',
                        accountHolder: lockedHolderName,
                        branch: ''
                      });
                      setBankModalOpen(true);
                    }}
                  >
                    Gửi lại yêu cầu xác thực
                  </button>
                </div>
              ) : state.bankAccount && state.bankAccount.isBankVerified ? (
                /* TRƯỜNG HỢP 3: ĐÃ XÁC THỰC THÀNH CÔNG */
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
                    {state.bankAccount.bankName}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, margin: '10px 0', letterSpacing: 2, color: '#CBFF4D' }}>
                    {state.bankAccount.accountNumber}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, color: '#94a3b8', display: 'block' }}>CHỦ TÀI KHOẢN</span>
                      <b style={{ textTransform: 'uppercase' }}>{state.bankAccount.accountHolder}</b>
                    </div>
                    <span style={{ fontSize: 11, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="check" width="11" height="11" />
                      <span>Đã xác thực</span>
                    </span>
                  </div>
                </div>
              ) : (
                /* TRƯỜNG HỢP 4: CHƯA LIÊN KẾT */
                <div
                  style={{
                    border: '2px dashed #f59e0b',
                    borderRadius: 14,
                    padding: '24px 18px',
                    background: 'rgba(245, 158, 11, 0.04)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ color: '#d97706', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <Icon name="card" width="36" height="36" />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--ink)' }}>Chưa liên kết tài khoản nhận tiền</h4>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Vui lòng nộp thông tin tài khoản ngân hàng chính chủ để Admin duyệt trước khi rút tiền.
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 auto' }}
                    onClick={() => {
                      setBankForm({
                        bankBin: '970422',
                        bankName: 'MB Bank',
                        accountNumber: '',
                        accountHolder: lockedHolderName,
                        branch: ''
                      });
                      setBankModalOpen(true);
                    }}
                  >
                    <Icon name="plus" width="13" height="13" />
                    <span>Xác thực tài khoản ngay</span>
                  </button>
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 0 }}>
                Tiền rút sẽ được chuyển trực tiếp vào tài khoản ngân hàng chính chủ trong vòng 5–15 phút sau khi duyệt.
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="crown" width="18" height="18" style={{ color: '#eab308' }} />
                  <span>Gói dịch vụ đang hoạt động</span>
                </h4>
                {state.badge && (
                  <span className="chip chip-lime" style={{ fontSize: 11, padding: '2px 8px', textTransform: 'uppercase', fontWeight: 700 }}>
                    {state.badge === 'master' ? 'VIP MASTER' : state.badge}
                  </span>
                )}
              </div>

              <div style={{ padding: '14px 16px', background: 'var(--surface-soft, rgba(0,0,0,0.03))', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {state.activePlanName || (state.vipBusiness ? 'VIP Business Suite' : (state.subscriptionPro ? 'Freelance Pro' : 'Tài khoản Cơ bản (Miễn phí)'))}
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Phí hoa hồng sàn:</span>
                    <strong style={{ color: '#16a34a' }}>
                      {((state.effectiveCommissionRate ?? (state.vipBusiness ? 0.05 : (state.subscriptionPro ? 0.05 : 0.10))) * 100).toFixed(0)}%
                    </strong>
                  </div>
                  {state.subscriptionExpiresAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Hạn sử dụng gói:</span>
                      <strong style={{ color: 'var(--ink)' }}>
                        {new Date(state.subscriptionExpiresAt).toLocaleDateString('vi-VN')}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <button className="btn btn-outline btn-block" onClick={() => navigate('/pricing')}>
                {state.activePlanCode === 'STU_MASTER' || state.activePlanCode === 'EMP_VIP'
                  ? 'Gia hạn gói đặc quyền →'
                  : (state.activePlanCode && state.activePlanCode !== 'FREE' ? 'Nâng cấp / Gia hạn gói →' : 'Xem các gói đặc quyền →')}
              </button>
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

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setReceiptModal(null)}>Đóng</button>
              <button className="btn btn-secondary btn-sm" onClick={() => downloadReceiptTxt(receiptModal)} title="Tải văn bản chi tiết sao kê dạng TXT">
                Tải văn bản (.txt)
              </button>
              <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => printReceipt(receiptModal)} title="Mở giao diện in và lưu file PDF tiêu chuẩn A4">
                <Icon name="download" width="14" height="14" /> Tải về / In phiếu thu (PDF)
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
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                🛡️ <b>Quy trình duyệt tay:</b> Sau khi gửi, Admin sẽ tra cứu tên chủ tài khoản qua App ngân hàng để xác nhận chính chủ trước khi kích hoạt tính năng rút tiền.
              </div>

              {/* TÙY CHỌN QUÉT ẢNH MÃ QR NGÂN HÀNG AUTOFILL */}
              <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px dashed #6366f1', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <input
                  type="file"
                  ref={qrFileInputRef}
                  accept="image/png, image/jpeg, image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleQrUpload}
                />
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#6366f1', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  disabled={qrDecoding}
                  onClick={() => qrFileInputRef.current?.click()}
                >
                  <span>📸</span>
                  <span>{qrDecoding ? 'Đang giải mã QR...' : 'Tải ảnh mã QR ngân hàng (Tự điền STK)'}</span>
                </button>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Hỗ trợ ảnh QR VietQR từ app ngân hàng (MB, VCB, TPBank...).
                </span>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Ngân hàng thụ hưởng:</label>
                <select
                  value={bankForm.bankBin || '970422'}
                  onChange={(e) => {
                    const selected = VIETNAM_BANKS.find((b) => b.bin === e.target.value);
                    setBankForm({
                      ...bankForm,
                      bankBin: e.target.value,
                      bankName: selected?.name || e.target.value
                    });
                  }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.name} - {b.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>Số tài khoản ngân hàng:</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={bankForm.accountNumber || ''}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\s/g, '') })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Tên chủ tài khoản (Hồ sơ chính chủ):
                </label>
                <input
                  type="text"
                  value={lockedHolderName}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'rgba(0,0,0,0.05)',
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--ink)'
                  }}
                />
                <small style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  💡 Tên chủ tài khoản phải trùng với tên hồ sơ của bạn trên hệ thống.
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setBankModalOpen(false)}>Hủy</button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={savingBank || !bankForm.accountNumber || !bankForm.accountNumber.trim()}
              >
                {savingBank ? 'Đang gửi...' : 'Gửi yêu cầu xác thực'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
