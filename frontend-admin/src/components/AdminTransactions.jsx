import React, { useState, useEffect, useCallback } from 'react';
import { fmtVND } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { exportTransactionsToExcel, exportTransactionsToCSV, getTransactionTypeLabel, TRANSACTION_TYPE_MAP } from '../utils/fileDownloader';
import { getAdminTransactions, getAdminTransactionsSummary } from '../api/adminApi';
import Icon from './Icon';
import Pagination from './Pagination';

const TYPE_OPTIONS = [
  { id: 'all', label: 'Tất cả loại' },
  { id: 'topup', label: 'Nạp tiền' },
  { id: 'escrow_hold', label: 'Giữ ký quỹ' },
  { id: 'escrow_release', label: 'Giải ngân dự án' },
  { id: 'escrow_refund', label: 'Hoàn ký quỹ' },
  { id: 'withdraw_hold', label: 'Giữ tiền rút' },
  { id: 'withdraw_refund', label: 'Hoàn tiền rút' },
  { id: 'withdraw_fee', label: 'Phí rút tiền' },
  { id: 'commission', label: 'Hoa hồng nền tảng' },
  { id: 'subscription', label: 'Phí đăng ký gói' },
  { id: 'featured_fee', label: 'Phí tin nổi bật' },
  { id: 'ad_spend', label: 'Chi phí quảng cáo' },
  { id: 'insurance_payout', label: 'Bồi thường bảo hiểm' },
  { id: 'referral_bonus', label: 'Thưởng giới thiệu' },
];

export default function AdminTransactions() {
  const { showToast } = useToast();

  const [summary, setSummary] = useState({ totalInflow: 0, totalOutflow: 0, netAmount: 0, totalCount: 0, byType: [] });
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  const [type, setType] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await getAdminTransactionsSummary({ fromDate, toDate });
      if (res) setSummary(res);
    } catch (err) {
      console.error('Lỗi tải tổng hợp giao dịch:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [fromDate, toDate]);

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await getAdminTransactions({ type, keyword, fromDate, toDate, page, pageSize });
      setItems(res?.items || []);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      showToast(err?.message || 'Không thể tải danh sách giao dịch.', 'warning');
    } finally {
      setLoadingList(false);
    }
  }, [type, keyword, fromDate, toDate, page, pageSize, showToast]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchList(); }, [fetchList]);

  // Lọc thay đổi (trừ đổi trang) thì quay về trang 1
  useEffect(() => { setPage(1); }, [type, keyword, fromDate, toDate]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const kpis = [
    {
      label: 'Tổng tiền vào hệ thống',
      value: loadingSummary ? '...' : fmtVND(summary.totalInflow || 0),
      icon: 'arrow-down-left',
      colorClass: 'kpi-emerald',
    },
    {
      label: 'Tổng tiền ra hệ thống',
      value: loadingSummary ? '...' : fmtVND(summary.totalOutflow || 0),
      icon: 'arrow-up-right',
      colorClass: 'kpi-amber',
    },
    {
      label: 'Biến động ròng',
      value: loadingSummary ? '...' : fmtVND(summary.netAmount || 0),
      icon: 'chart-bar',
      colorClass: 'kpi-blue',
    },
    {
      label: 'Tổng số giao dịch',
      value: loadingSummary ? '...' : `${summary.totalCount || 0} giao dịch`,
      icon: 'receipt',
      colorClass: 'kpi-purple',
    },
  ];

  const buildFilterLabel = () => {
    const parts = [];
    if (type !== 'all') parts.push(TYPE_OPTIONS.find((t) => t.id === type)?.label || type);
    if (fromDate) parts.push(`từ ${fromDate}`);
    if (toDate) parts.push(`đến ${toDate}`);
    if (keyword) parts.push(`từ khóa "${keyword}"`);
    return parts.length > 0 ? `Giao dịch (${parts.join(', ')})` : 'Toàn bộ giao dịch hệ thống';
  };

  const handleExport = async (format) => {
    try {
      // Xuất theo đúng bộ lọc hiện tại, lấy tối đa 2000 giao dịch gần nhất để tránh quá nặng
      const res = await getAdminTransactions({ type, keyword, fromDate, toDate, page: 1, pageSize: 2000 });
      const rows = res?.items || [];
      if (rows.length === 0) {
        showToast('Không có giao dịch nào phù hợp bộ lọc để xuất báo cáo.', 'warning');
        return;
      }
      const metadata = {
        userName: 'Ban Quản trị SkillBridge',
        userEmail: 'admin@skillbridge.vn',
        filterLabel: buildFilterLabel(),
        fileName: `Bao_cao_giao_dich_SkillBridge.${format}`,
      };
      if (format === 'csv') {
        exportTransactionsToCSV(rows, metadata);
      } else {
        exportTransactionsToExcel(rows, metadata);
      }
      showToast(`Đã xuất báo cáo giao dịch ${format.toUpperCase()} thành công!`, 'check');
    } catch (err) {
      showToast(err?.message || 'Không thể xuất báo cáo giao dịch.', 'warning');
    }
  };

  const handleResetFilters = () => {
    setType('all');
    setKeyword('');
    setFromDate('');
    setToDate('');
  };

  return (
    <section className="adm-section active">
      <div className="adm-head">
        <h2>Quản lý giao dịch</h2>
        <p>Theo dõi toàn bộ dòng tiền trong hệ thống: nạp tiền, giữ/giải ngân ký quỹ, rút tiền, hoa hồng, phí gói và quảng cáo.</p>
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

      {summary.byType?.length > 0 && (
        <div className="adm-card">
          <div className="adm-card-head">
            <h4>Thống kê theo loại giao dịch</h4>
            <span className="sub">Theo bộ lọc thời gian hiện tại</span>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Loại giao dịch</th>
                  <th>Số lượng</th>
                  <th>Tổng biến động (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {summary.byType.map((b) => (
                  <tr key={b.type}>
                    <td>{getTransactionTypeLabel(b.type) !== TRANSACTION_TYPE_MAP.default ? getTransactionTypeLabel(b.type) : (TYPE_OPTIONS.find((t) => t.id === b.type)?.label || b.type)}</td>
                    <td>{b.count}</td>
                    <td style={{ fontWeight: 700, color: b.totalAmount >= 0 ? '#16a34a' : '#dc2626' }}>
                      {b.totalAmount >= 0 ? '+' : ''}{fmtVND(b.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="adm-card">
        <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="receipt" width="16" height="16" /> Danh sách giao dịch
            </h4>
            <span className="sub">Lọc theo loại, người dùng, khoảng thời gian hoặc từ khóa</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleExport('xlsx')}>
              <Icon name="download" width="14" height="14" /> Xuất Excel
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => handleExport('csv')}>
              <Icon name="download" width="14" height="14" /> Xuất CSV
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '0 16px 16px' }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', color: '#374151', minWidth: 170 }}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tìm theo tên, email hoặc nội dung giao dịch..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff', minWidth: 260, flex: 1 }}
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            title="Từ ngày"
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', color: '#374151' }}
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            title="Đến ngày"
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, background: '#fff', color: '#374151' }}
          />
          <button type="button" className="cf-btn-secondary" onClick={handleResetFilters} style={{ padding: '7px 10px', fontSize: 12 }}>
            Xóa lọc
          </button>
        </div>

        {loadingList ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Đang tải danh sách giao dịch...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            Không có giao dịch nào phù hợp bộ lọc hiện tại.
          </div>
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Người dùng</th>
                    <th>Loại giao dịch</th>
                    <th>Nội dung</th>
                    <th>Số tiền</th>
                    <th>Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => {
                    const isCredit = t.sign === 1;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#TX-{t.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.userName || 'Hệ thống'}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{t.userEmail}</div>
                        </td>
                        <td>
                          <span className="chip" style={{ background: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
                            {TYPE_OPTIONS.find((opt) => opt.id === t.type)?.label || t.type}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{t.label}</td>
                        <td style={{ fontWeight: 700, color: isCredit ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                          {isCredit ? '+' : '-'}{fmtVND(t.amount)}
                        </td>
                        <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                          {t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
              pageSizeOptions={[20, 50, 100]}
              itemLabel="giao dịch"
            />
          </>
        )}
      </div>
    </section>
  );
}
