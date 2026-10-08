import React, { useState, useEffect, useCallback } from 'react';
import { fmtVND } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../utils/fileDownloader';
import { getAdminFinanceSummary, getAdminWithdrawals, approveWithdrawal, rejectWithdrawal } from '../api/adminApi';
import Icon from './Icon';
import AdminModal from './AdminModal';
import Pagination from './Pagination';

export default function AdminFinance() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Finance summary state (Dữ liệu thật 100% từ Database)
  const [summary, setSummary] = useState({
    totalWalletBalance: 0,
    totalEscrowBalance: 0,
    pendingWithdrawalsCount: 0,
    pendingWithdrawalsAmount: 0,
    completedWithdrawalsCount: 0,
    completedWithdrawalsAmount: 0,
    totalWithdrawalsCount: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Withdrawal management state
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState('pending');
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve' | 'reject', item }
  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalPageSize, setWithdrawalPageSize] = useState(10);

  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await getAdminFinanceSummary();
      if (res) setSummary(res);
    } catch (err) {
      console.error('Lỗi tải tổng hợp tài chính:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    setWithdrawalPage(1);
  }, [withdrawalStatus]);

  const withdrawalTotalPages = Math.ceil(withdrawals.length / withdrawalPageSize) || 1;
  const pagedWithdrawals = React.useMemo(() => {
    const start = (withdrawalPage - 1) * withdrawalPageSize;
    return withdrawals.slice(start, start + withdrawalPageSize);
  }, [withdrawals, withdrawalPage, withdrawalPageSize]);

  const fetchWithdrawals = async (status = withdrawalStatus) => {
    setLoadingWithdrawals(true);
    try {
      const res = await getAdminWithdrawals(status, 1, 50);
      setWithdrawals(res?.items || []);
    } catch (err) {
      showToast(err?.message || 'Không thể tải danh sách yêu cầu rút tiền.', 'warning');
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals(withdrawalStatus);
  }, [withdrawalStatus]);

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setSubmittingAction(true);
    try {
      if (actionModal.type === 'approve') {
        await approveWithdrawal(actionModal.item.id, actionNote);
        showToast(`Đã duyệt chi ${fmtVND(actionModal.item.amount)} thành công!`, 'check');
      } else {
        if (!actionNote.trim()) {
          showToast('Vui lòng nhập lý do từ chối để thông báo cho người dùng.', 'warning');
          setSubmittingAction(false);
          return;
        }
        await rejectWithdrawal(actionModal.item.id, actionNote);
        showToast(`Đã từ chối và hoàn tiền ${fmtVND(actionModal.item.amount)} vào ví người dùng.`, 'check');
      }
      setActionModal(null);
      setActionNote('');
      fetchWithdrawals(withdrawalStatus);
      fetchSummary();
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.', 'warning');
    } finally {
      setSubmittingAction(false);
    }
  };

  const kpis = [
    {
      label: 'Tổng số dư ví thành viên',
      value: loadingSummary ? '...' : fmtVND(summary.totalWalletBalance || 0),
      icon: 'bank',
      colorClass: 'kpi-emerald',
    },
    {
      label: 'Tiền ký quỹ Escrow bảo chứng',
      value: loadingSummary ? '...' : fmtVND(summary.totalEscrowBalance || 0),
      icon: 'shield-check',
      colorClass: 'kpi-blue',
    },
    {
      label: 'Chờ duyệt rút tiền',
      value: loadingSummary ? '...' : `${summary.pendingWithdrawalsCount} lệnh (${fmtVND(summary.pendingWithdrawalsAmount || 0)})`,
      icon: 'clock',
      colorClass: 'kpi-amber',
    },
    {
      label: 'Đã giải ngân rút thành công',
      value: loadingSummary ? '...' : fmtVND(summary.completedWithdrawalsAmount || 0),
      icon: 'check',
      colorClass: 'kpi-purple',
    },
  ];

  const exportReport = (period, format = 'xlsx') => {
    const labels = { week: 'tuan', month: 'thang', quarter: 'quy' };
    const periodNames = { week: 'Tuần này', month: 'Tháng này', quarter: 'Quý này' };
    const metadata = {
      userName: 'Ban Quản trị Tài chính SkillBridge',
      userEmail: 'finance-admin@skillbridge.vn',
      filterLabel: `Báo cáo tài chính & rút tiền (${periodNames[period] || period})`,
      fileName: `Bao_cao_tai_chinh_SkillBridge_${labels[period]}.${format}`,
    };

    if (format === 'csv') {
      exportTransactionsToCSV(withdrawals, metadata);
    } else {
      exportTransactionsToExcel(withdrawals, metadata);
    }
    showToast(`Đã xuất báo cáo tài chính ${format.toUpperCase()} (${periodNames[period]}) thành công!`, 'check');
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý tài chính & Xét duyệt rút tiền</h2>
        <p>Theo dõi dòng tiền Escrow, số dư ví toàn sàn và phê duyệt giải ngân lệnh rút tiền về ngân hàng.</p>
      </div>

      <div className="adm-vibrant-kpis">
        {kpis.map((k) => (
          <div className={`adm-vibrant-kpi ${k.colorClass}`} key={k.label}>
            <div className="adm-kpi-icon-wrap">
              <Icon name={k.icon} style={{ width: 22, height: 22 }} />
            </div>
            <div className="adm-kpi-content">
              <div className="k-lbl">{k.label}</div>
              <div className="k-val">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h4>Doanh thu theo nguồn</h4>
          <span className="sub">Kỳ hiện tại</span>
        </div>
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: 13, background: '#f9fafb', borderRadius: 6, margin: 12 }}>
          Chưa có dữ liệu thống kê doanh thu theo kỳ từ hệ thống.
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield-check" width="16" height="16" /> Quỹ bảo hiểm cộng đồng
          </h4>
        </div>
        <div className="adm-kpis" style={{ marginBottom: 6 }}>
          <div className="adm-kpi"><div className="k-lbl">Số dư quỹ</div><div className="k-val">0 đ</div></div>
          <div className="adm-kpi"><div className="k-lbl">Đã chi trả (tổng)</div><div className="k-val">0 đ</div></div>
          <div className="adm-kpi"><div className="k-lbl">Số ca đã xử lý</div><div className="k-val">0</div></div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head"><h4>Quản lý gói nâng cấp</h4></div>
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#6b7280', fontSize: 13, background: '#f9fafb', borderRadius: 6, margin: 12 }}>
          Chưa có dữ liệu đăng ký gói nâng cấp từ người dùng.
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="bank" width="16" height="16" /> Quản lý yêu cầu rút tiền (Withdrawal Requests)
            </h4>
            <span className="sub">Xét duyệt yêu cầu rút tiền về tài khoản ngân hàng chính chủ của người dùng</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'pending', label: 'Chờ duyệt' },
              { id: 'processing', label: 'Chờ Checker (> 5tr)' },
              { id: 'completed', label: 'Đã duyệt' },
              { id: 'rejected', label: 'Đã từ chối' },
              { id: 'all', label: 'Tất cả' }
            ].map(({ id: st, label }) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${withdrawalStatus === st ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setWithdrawalStatus(st)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadingWithdrawals ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Đang tải danh sách yêu cầu rút tiền...
          </div>
        ) : withdrawals.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Không có yêu cầu rút tiền nào trong mục này.
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Mã GD</th>
                  <th>Người dùng</th>
                  <th>Số tiền</th>
                  <th>Tài khoản thụ hưởng</th>
                  <th>Thời gian tạo</th>
                  <th>Trạng thái</th>
                  <th style={{ width: 170 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pagedWithdrawals.map((w) => {
                  const isPending = w.status === 'pending';
                  const isAwaitingChecker = w.status === 'processing';
                  const isCompleted = w.status === 'completed';
                  const isRejected = w.status === 'rejected';
                  const canAct = isPending || isAwaitingChecker;

                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{w.code || `#W-${w.id}`}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.userName || 'Người dùng'}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{w.userEmail}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        <div>{fmtVND(w.amount)}</div>
                        {w.requiresMakerChecker && (
                          <span style={{ fontSize: 10.5, background: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                            Maker-Checker
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.bankName}</div>
                        <div style={{ fontSize: 12.5, fontFamily: 'monospace' }}>
                          STK: {w.accountNumberFull ?? w.accountNumberMask ?? '—'}
                        </div>
                        {w.decryptError && (
                          <div style={{ marginTop: 2 }}>
                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              ⚠️ Lỗi giải mã STK
                            </span>
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                          Chủ TK: {w.accountHolderName || '—'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {w.createdAt ? new Date(w.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            background: isCompleted ? '#dcfce7' : isRejected ? '#fee2e2' : isAwaitingChecker ? '#ede9fe' : '#fef3c7',
                            color: isCompleted ? '#166534' : isRejected ? '#991b1b' : isAwaitingChecker ? '#5b21b6' : '#92400e',
                            fontWeight: 600
                          }}
                        >
                          {isCompleted ? '✓ Đã duyệt' : isRejected ? '✗ Đã từ chối' : isAwaitingChecker ? '🛡️ Chờ Checker' : '⏳ Chờ duyệt'}
                        </span>
                        {w.makerName && (
                          <div style={{ fontSize: 11, color: '#6d28d9', marginTop: 3 }}>
                            Maker: <strong>{w.makerName}</strong>
                          </div>
                        )}
                        {w.rejectReason && (
                          <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 4 }}>
                            {w.rejectReason}
                          </div>
                        )}
                      </td>
                      <td>
                        {canAct ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            <button
                              type="button"
                              className="cf-btn-primary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                              disabled={w.decryptError || !w.accountNumberFull}
                              title={w.decryptError ? 'Không thể duyệt vì STK bị lỗi giải mã' : (!w.accountNumberFull ? 'Không thể duyệt vì thiếu STK đầy đủ' : 'Duyệt chi')}
                              onClick={() => {
                                setActionModal({ type: 'approve', item: w });
                                setActionNote('');
                              }}
                            >
                              {isAwaitingChecker ? 'Checker duyệt' : (w.requiresMakerChecker ? 'Maker duyệt' : 'Duyệt chi')}
                            </button>
                            <button
                              type="button"
                              className="cf-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 12, color: '#b91c1c' }}
                              onClick={() => {
                                setActionModal({ type: 'reject', item: w });
                                setActionNote('');
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Đã xử lý</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {withdrawals.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Pagination
                currentPage={withdrawalPage}
                totalPages={withdrawalTotalPages}
                totalItems={withdrawals.length}
                pageSize={withdrawalPageSize}
                onPageChange={setWithdrawalPage}
                onPageSizeChange={(sz) => { setWithdrawalPageSize(sz); setWithdrawalPage(1); }}
                pageSizeOptions={[5, 10, 20, 50]}
                itemLabel="yêu cầu rút tiền"
              />
            </div>
          )}
        </>
      )}
      </div>

      {actionModal && (
        <AdminModal
          isOpen={!!actionModal}
          onClose={() => setActionModal(null)}
          title={actionModal.type === 'approve' ? 'Xác nhận duyệt chi rút tiền' : 'Từ chối yêu cầu rút tiền'}
          icon={actionModal.type === 'approve' ? 'check' : 'x'}
          iconColor={actionModal.type === 'approve' ? 'var(--emerald)' : 'var(--rose)'}
          maxWidth={520}
        >
          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 16 }}>
            {actionModal.type === 'approve' ? (
              <>
                {actionModal.item.requiresMakerChecker && (
                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#5b21b6' }}>
                    <strong>🛡️ Quy tắc Phê duyệt kép Maker-Checker (&gt; 5.000.000đ):</strong>
                    {actionModal.item.status === 'processing'
                      ? ` Bạn đang duyệt với vai trò Checker cấp 2. Maker đã duyệt: ${actionModal.item.makerName || 'Admin'}. (Lưu ý: Checker phải là Quản trị viên độc lập, khác Maker).`
                      : ' Bạn đang duyệt với vai trò Maker bước 1. Sau khi duyệt, lệnh sẽ chuyển sang trạng thái Chờ Checker phê duyệt cấp 2.'}
                  </div>
                )}
                <p>
                  Bạn đang chuẩn bị duyệt yêu cầu rút <strong>{fmtVND(actionModal.item.amount)}</strong> cho {actionModal.item.userName} ({actionModal.item.bankName} - STK: {actionModal.item.accountNumberFull || `${actionModal.item.accountNumberMask || '—'} (CẢNH BÁO: Chỉ có số mặt nạ)`} | Chủ TK: {actionModal.item.accountHolderName || '—'}). Hãy đảm bảo lệnh chuyển khoản ngân hàng đã được kiểm tra cẩn thận.
                </p>
              </>
            ) : (
              <p>
                Khi từ chối, số tiền <strong>{fmtVND(actionModal.item.amount)}</strong> sẽ được tự động hoàn lại 100% vào ví của {actionModal.item.userName}.
              </p>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {actionModal.type === 'approve' ? 'Ghi chú / Mã UNC tham chiếu (Tùy chọn)' : 'Lý do từ chối (Bắt buộc)'}
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontSize: 13.5,
                minHeight: 80,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
              placeholder={
                actionModal.type === 'approve'
                  ? 'Ví dụ: Đã chuyển qua Vietcombank, mã UNC #123456'
                  : 'Ví dụ: Tên tài khoản ngân hàng không khớp thông tin hồ sơ, vui lòng kiểm tra lại'
              }
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="adm-btn-action outline"
              disabled={submittingAction}
              onClick={() => setActionModal(null)}
            >
              Hủy
            </button>
            <button
              type="button"
              className={`adm-btn-action ${actionModal.type === 'approve' ? 'success' : 'danger'}`}
              disabled={submittingAction || (actionModal.type === 'reject' && !actionNote.trim())}
              onClick={handleExecuteAction}
            >
              {submittingAction ? (
                <><span className="adm-spinner" /> Đang xử lý...</>
              ) : actionModal.type === 'approve' ? (
                'Xác nhận Đã Chuyển Tiền'
              ) : (
                'Xác nhận Từ Chối & Hoàn Tiền'
              )}
            </button>
          </div>
        </AdminModal>
      )}

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
