import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { fmtVND } from '../utils/formatters';
import { revenueBarsSeed } from '../data/adminSeed';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '../utils/fileDownloader';
import { getAdminWithdrawals, approveWithdrawal, rejectWithdrawal } from '../api/adminApi';
import Icon from './Icon';

export default function AdminFinance() {
  const { subscriptions, renewSubscription, cancelSubscription } = useAdmin();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Withdrawal management state
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState('pending');
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve' | 'reject', item }
  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra khi xử lý yêu cầu.', 'warning');
    } finally {
      setSubmittingAction(false);
    }
  };
  const state = {
    transactions: [],
    insuranceFund: 8200000,
    claims: [
      { id: 'CLM-101', jobTitle: 'Biên tập 5 bài viết SEO Website', desc: 'Nhà tuyển dụng không phản hồi sau khi nhận bài 7 ngày', payout: 150000, status: 'resolved', statusLabel: 'Đã bồi thường 40%', date: '19/08/2026' },
      { id: 'CLM-102', jobTitle: 'Dựng motion graphic intro 10s', desc: 'Đang gửi bằng chứng đối soát video demo', payout: 0, status: 'pending', statusLabel: 'Đang chờ HĐ Bảo hiểm duyệt', date: '21/08/2026' },
    ]
  };
  const totalRevenue = revenueBarsSeed.reduce((s, b) => s + b.value, 0);

  const kpis = [
    { label: 'Tổng doanh thu', value: fmtVND(totalRevenue) },
    { label: 'Doanh thu tháng này', value: fmtVND(36500000) },
    { label: 'Tăng trưởng MoM', value: '+18.4%' },
    { label: 'ARPU', value: '420.000đ' },
  ];

  const exportReport = (period, format = 'xlsx') => {
    const labels = { week: 'tuan', month: 'thang', quarter: 'quy' };
    const periodNames = { week: 'Tuần này', month: 'Tháng này', quarter: 'Quý này' };
    const metadata = {
      userName: 'Ban Quản trị Tài chính SkillBridge',
      userEmail: 'finance-admin@skillbridge.vn',
      filterLabel: `Báo cáo tài chính & doanh thu (${periodNames[period] || period})`,
      fileName: `Bao_cao_tai_chinh_SkillBridge_${labels[period]}.${format}`
    };

    if (format === 'csv') {
      exportTransactionsToCSV(state.transactions, metadata);
    } else {
      exportTransactionsToExcel(state.transactions, metadata);
    }
    showToast(`Đã xuất báo cáo tài chính ${format.toUpperCase()} (${periodNames[period]}) thành công!`, 'check');
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
        <div className="adm-card-head">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield-check" width="16" height="16" /> Quỹ bảo hiểm cộng đồng
          </h4>
        </div>
        <div className="adm-kpis" style={{ marginBottom: 6 }}>
          <div className="adm-kpi"><div className="k-lbl">Số dư quỹ</div><div className="k-val">{fmtVND(state.insuranceFund || 0)}</div></div>
          <div className="adm-kpi"><div className="k-lbl">Đã chi trả (tổng)</div><div className="k-val">{fmtVND((state.claims || []).reduce((s, c) => s + (c.payout || 0), 0))}</div></div>
          <div className="adm-kpi"><div className="k-lbl">Số ca đã xử lý</div><div className="k-val">{(state.claims || []).length}</div></div>
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
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="bank" width="16" height="16" /> Quản lý yêu cầu rút tiền (Withdrawal Requests)
            </h4>
            <span className="sub">Xét duyệt yêu cầu rút tiền về tài khoản ngân hàng chính chủ của người dùng</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['pending', 'completed', 'rejected', 'all'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${withdrawalStatus === st ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setWithdrawalStatus(st)}
              >
                {st === 'pending' ? 'Chờ duyệt' : st === 'completed' ? 'Đã duyệt' : st === 'rejected' ? 'Đã từ chối' : 'Tất cả'}
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
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const isPending = w.status === 'pending';
                  const isCompleted = w.status === 'completed';
                  const isRejected = w.status === 'rejected';
                  return (
                    <tr key={w.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{w.code || `#W-${w.id}`}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.userName || 'Người dùng'}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{w.userEmail}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>
                        {fmtVND(w.amount)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{w.bankName}</div>
                        <div style={{ fontSize: 12.5, fontFamily: 'monospace' }}>STK: {w.bankAccountNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Chủ TK: {w.bankAccountHolder}</div>
                      </td>
                      <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {w.createdAt ? new Date(w.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            background: isCompleted ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                            color: isCompleted ? '#166534' : isRejected ? '#991b1b' : '#92400e',
                            fontWeight: 600
                          }}
                        >
                          {isCompleted ? '✓ Đã duyệt' : isRejected ? '✗ Đã từ chối' : '⏳ Chờ duyệt'}
                        </span>
                        {w.adminNote && (
                          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                            {w.adminNote}
                          </div>
                        )}
                      </td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setActionModal({ type: 'approve', item: w });
                                setActionNote('');
                              }}
                            >
                              Duyệt chi
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}
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
        )}
      </div>

      {actionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              {actionModal.type === 'approve' ? 'Xác nhận duyệt yêu cầu rút tiền' : 'Từ chối yêu cầu rút tiền'}
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              {actionModal.type === 'approve'
                ? `Bạn đang chuẩn bị duyệt yêu cầu rút ${fmtVND(actionModal.item.amount)} cho ${actionModal.item.userName} (${actionModal.item.bankName} - ${actionModal.item.bankAccountNumber}). Hãy đảm bảo lệnh chuyển khoản ngân hàng đã được thực hiện.`
                : `Khi từ chối, số tiền ${fmtVND(actionModal.item.amount)} sẽ được tự động hoàn lại 100% vào ví của ${actionModal.item.userName}.`}
            </p>

            <div style={{ marginTop: 16, marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {actionModal.type === 'approve' ? 'Ghi chú / Mã UNC tham chiếu (Tùy chọn)' : 'Lý do từ chối (Bắt buộc)'}
              </label>
              <textarea
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
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
                className="btn btn-outline"
                disabled={submittingAction}
                onClick={() => setActionModal(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`btn ${actionModal.type === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                style={actionModal.type === 'reject' ? { background: 'var(--coral)', color: '#fff', border: 'none' } : {}}
                disabled={submittingAction || (actionModal.type === 'reject' && !actionNote.trim())}
                onClick={handleExecuteAction}
              >
                {submittingAction
                  ? 'Đang xử lý...'
                  : actionModal.type === 'approve'
                  ? 'Xác nhận Đã Chuyển Tiền'
                  : 'Xác nhận Từ Chối & Hoàn Tiền'}
              </button>
            </div>
          </div>
        </div>
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
