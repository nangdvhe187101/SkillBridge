import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { useToast } from '../context/ToastContext';
import {
  getAdminContractStats,
  getAdminContracts,
  getAdminContractDetail,
  forceReleaseContract,
  forceRefundContract,
  approveCheckerContract,
} from '../api/adminApi';
import { fmtVND } from '../utils/formatters';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString('vi-VN');
  } catch {
    return dateStr;
  }
}

export default function AdminContracts() {
  const { showToast } = useToast();

  // State dữ liệu chính
  const [stats, setStats] = useState({
    totalActiveContracts: 0,
    totalEscrowLocked: 0,
    slaBreachedReviewCount: 0,
    slaBreachedDeadlineCount: 0,
  });
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bộ lọc & phân trang
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal xem Deliverable & Chat
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [contractDetail, setContractDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTabDetail, setActiveTabDetail] = useState('deliverables'); // 'deliverables' | 'chat'

  // Modal cưỡng chế (Force Action Confirmation Modal)
  const [forceModal, setForceModal] = useState(null); // { contract, actionType: 'release' | 'refund' }
  const [reason, setReason] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Tải thống kê
  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminContractStats();
      if (data) setStats(data);
    } catch (err) {
      console.error('Lỗi tải thống kê hợp đồng:', err);
    }
  }, []);

  // Tải danh sách hợp đồng
  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminContracts({
        search,
        status: statusFilter === 'all' ? '' : statusFilter,
        page: currentPage,
        pageSize: 10,
      });

      if (data && data.items) {
        setContracts(data.items);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalCount || 0);
      } else {
        setContracts([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hợp đồng:', err);
      setError(err.message || 'Không thể tải danh sách hợp đồng từ hệ thống.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentPage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Xem chi tiết hồ sơ & tin nhắn
  const handleOpenDetail = async (contractId) => {
    setSelectedContractId(contractId);
    setLoadingDetail(true);
    setActiveTabDetail('deliverables');
    try {
      const detail = await getAdminContractDetail(contractId);
      setContractDetail(detail);
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết hợp đồng.', 'ban');
      setSelectedContractId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Mở modal cưỡng chế
  const handleOpenForceModal = (contract, actionType) => {
    setForceModal({ contract, actionType });
    setReason('');
    setConfirmPhrase('');
    setActionError('');
  };

  // Gửi lệnh cưỡng chế
  const handleExecuteForceAction = async () => {
    if (!reason.trim() || reason.trim().length < 10) {
      setActionError('Lý do cưỡng chế bắt buộc phải nhập tối thiểu 10 ký tự để lưu vết kiểm toán.');
      return;
    }
    if (confirmPhrase.trim().toUpperCase() !== 'XAC NHAN') {
      setActionError('Vui lòng gõ chính xác cụm từ "XAC NHAN" để mở khóa thực hiện.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');

    try {
      const payload = {
        reason: reason.trim(),
        confirmPhrase: 'XAC NHAN',
      };

      let res;
      if (forceModal.actionType === 'release') {
        res = await forceReleaseContract(forceModal.contract.id, payload);
      } else {
        res = await forceRefundContract(forceModal.contract.id, payload);
      }

      showToast(res?.message || 'Thực hiện thao tác thành công!', 'check');
      setForceModal(null);
      fetchContracts();
      fetchStats();
      if (selectedContractId === forceModal.contract.id) {
        handleOpenDetail(selectedContractId);
      }
    } catch (err) {
      setActionError(err.message || 'Có lỗi xảy ra khi thực hiện cưỡng chế.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phê duyệt cấp 2 (Checker Approval)
  const handleCheckerApprove = async (contract) => {
    if (!window.confirm(`Bạn có chắc chắn muốn phê duyệt bước 2 cho hợp đồng #${contract.id} (${fmtVND(contract.escrowAmount)})?`)) {
      return;
    }

    try {
      const res = await approveCheckerContract(contract.id);
      showToast(res?.message || 'Đã phê duyệt bước 2 thành công!', 'check');
      fetchContracts();
      fetchStats();
      if (selectedContractId === contract.id) {
        handleOpenDetail(selectedContractId);
      }
    } catch (err) {
      showToast(err.message || 'Lỗi phê duyệt bước 2.', 'ban');
    }
  };

  const kpis = [
    { label: 'Hợp đồng đang thực hiện', value: stats.totalActiveContracts },
    { label: 'Tổng Escrow đang bảo chứng', value: fmtVND(stats.totalEscrowLocked) },
    {
      label: 'Cảnh báo SLA Nghiệm thu',
      value: stats.slaBreachedReviewCount,
      isWarning: stats.slaBreachedReviewCount > 0,
    },
    {
      label: 'Cảnh báo SLA Deadline',
      value: stats.slaBreachedDeadlineCount,
      isWarning: stats.slaBreachedDeadlineCount > 0,
    },
  ];

  return (
    <div className="adm-page" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div className="cf-page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>
              Giám sát Hợp đồng & Tiền Ký quỹ Đang Chạy
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              Theo dõi dòng tiền ký quỹ Escrow thời gian thực, phát hiện vi phạm SLA nghiệm thu/tiến độ và cưỡng chế giải ngân/hoàn cọc bảo đảm an toàn hệ thống.
            </p>
          </div>
          <button
            className="cf-btn-secondary"
            onClick={() => {
              fetchContracts();
              fetchStats();
            }}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
          >
            <Icon name="refresh" style={{ width: 14, height: 14 }} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="adm-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div
            className="adm-kpi"
            key={k.label}
            style={{
              background: '#ffffff',
              border: k.isWarning ? '1px solid #fecaca' : '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '16px 20px',
            }}
          >
            <div className="k-lbl" style={{ fontSize: 12, color: k.isWarning ? '#b91c1c' : '#6b7280', fontWeight: 600 }}>
              {k.label}
            </div>
            <div className="k-val" style={{ fontSize: 24, fontWeight: 700, color: k.isWarning ? '#dc2626' : '#111827', marginTop: 4 }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar (Search & Filters) */}
      <div
        className="cf-action-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã HĐ, tên việc, NTD, SV..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
          {search && (
            <button
              className="cf-btn-secondary"
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              style={{ padding: '6px 10px', fontSize: 12 }}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              background: '#ffffff',
              color: '#374151',
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="in_progress">Đang thực hiện (In Progress)</option>
            <option value="submitted">Đã nộp SP (Submitted)</option>
            <option value="pending_checker">Chờ Maker-Checker duyệt</option>
            <option value="sla_breached">Cảnh báo vi phạm SLA</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: '#6b7280' }}>
            Tìm thấy <b style={{ color: '#111827' }}>{totalItems}</b> hợp đồng
          </span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 6,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={fetchContracts}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="cf-table-container" style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14 }}>Đang tải danh sách hợp đồng & ký quỹ...</div>
          </div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
              Không có hợp đồng nào phù hợp bộ lọc
            </div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc hiện tại.
            </div>
            <button
              className="cf-btn-secondary"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              style={{ padding: '6px 12px' }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cf-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px', width: 90 }}>Mã HĐ</th>
                  <th style={{ padding: '12px 16px', minWidth: 220 }}>Tên công việc</th>
                  <th style={{ padding: '12px 16px', minWidth: 160 }}>Nhà tuyển dụng</th>
                  <th style={{ padding: '12px 16px', minWidth: 160 }}>Sinh viên</th>
                  <th style={{ padding: '12px 16px', minWidth: 120 }}>Giá trị HĐ</th>
                  <th style={{ padding: '12px 16px', minWidth: 120 }}>Escrow giữ</th>
                  <th style={{ padding: '12px 16px', minWidth: 180 }}>Trạng thái & SLA</th>
                  <th style={{ padding: '12px 16px', minWidth: 200, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        #{c.id}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{c.title}</div>
                        <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 2 }}>
                          Tạo ngày: {formatDate(c.postedAt)}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{c.employerName}</div>
                        <div style={{ fontSize: 11.5, color: '#6b7280' }}>{c.employerEmail}</div>
                        <span className="cf-status-pill" style={{ fontSize: 10.5, marginTop: 2 }}>
                          Uy tín: {c.employerReliability}/100
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>{c.studentName}</div>
                        <div style={{ fontSize: 11.5, color: '#6b7280' }}>{c.studentEmail}</div>
                        <span className="cf-status-pill" style={{ fontSize: 10.5, marginTop: 2 }}>
                          Uy tín: {c.studentReliability}/100
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>
                        {fmtVND(c.budget)}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0051c3' }}>
                        {fmtVND(c.escrowAmount)}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {c.isPendingChecker ? (
                            <span className="cf-status-pill" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#6d28d9' }}>
                              <span className="cf-status-dot" style={{ background: '#7c3aed' }} />
                              Chờ Checker duyệt ({c.pendingActionType === 'release' ? 'Giải ngân' : 'Hoàn cọc'})
                            </span>
                          ) : (
                            <span className="cf-status-pill">
                              <span
                                className="cf-status-dot"
                                style={{
                                  background: c.status === 'submitted' ? '#2563eb' : '#16a34a',
                                }}
                              />
                              <span style={{ color: c.status === 'submitted' ? '#1d4ed8' : '#15803d' }}>
                                {c.status === 'submitted' ? 'Đã nộp sản phẩm' : 'Đang thực hiện'}
                              </span>
                            </span>
                          )}

                          {c.isSlaBreachedReview && (
                            <span
                              className="cf-status-pill"
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 11 }}
                            >
                              ⚠️ Quá hạn NTD duyệt (&gt;72h)
                            </span>
                          )}

                          {c.isSlaBreachedDeadline && (
                            <span
                              className="cf-status-pill"
                              style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontSize: 11 }}
                            >
                              ⚠️ Quá deadline dự án
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div className="cf-btn-group" style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="cf-btn-secondary"
                            onClick={() => handleOpenDetail(c.id)}
                            style={{ padding: '5px 9px', fontSize: 12 }}
                            title="Xem file giao nộp & tin nhắn"
                          >
                            Hồ sơ & Chat
                          </button>

                          {c.isPendingChecker ? (
                            <button
                              onClick={() => handleCheckerApprove(c)}
                              style={{
                                padding: '5px 9px',
                                fontSize: 12,
                                background: '#7c3aed',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                              title="Duyệt lệnh cưỡng chế bước 2"
                            >
                              ✓ Duyệt Maker-Checker
                            </button>
                          ) : (
                            <>
                              <button
                                className="cf-btn-secondary"
                                onClick={() => handleOpenForceModal(c, 'release')}
                                style={{ padding: '5px 8px', fontSize: 12, color: '#15803d', borderColor: '#bbf7d0' }}
                                title="Cưỡng chế giải ngân Escrow cho Sinh viên"
                              >
                                Giải ngân
                              </button>
                              <button
                                className="cf-btn-secondary"
                                onClick={() => handleOpenForceModal(c, 'refund')}
                                style={{ padding: '5px 8px', fontSize: 12, color: '#b91c1c', borderColor: '#fecaca' }}
                                title="Cưỡng chế hoàn cọc Escrow cho Nhà tuyển dụng"
                              >
                                Hoàn cọc
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            <span>
              Trang {currentPage} / {totalPages} (Tổng {totalItems} hợp đồng)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="cf-btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                ‹ Trang trước
              </button>
              <button
                className="cf-btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                Trang sau ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Deliverable & Chat Evidence Inspector */}
      {selectedContractId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              width: '100%',
              maxWidth: 800,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  Hồ sơ nghiệm thu & Bằng chứng trao đổi — HĐ #{selectedContractId}
                </h3>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {contractDetail?.title || 'Đang tải dữ liệu...'}
                </span>
              </div>
              <button
                onClick={() => setSelectedContractId(null)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#9ca3af', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Subtabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 20px', background: '#f9fafb' }}>
              <button
                onClick={() => setActiveTabDetail('deliverables')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTabDetail === 'deliverables' ? '2px solid #0051c3' : '2px solid transparent',
                  color: activeTabDetail === 'deliverables' ? '#0051c3' : '#6b7280',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                📦 Sản phẩm bàn giao ({contractDetail?.deliverables?.length || 0})
              </button>
              <button
                onClick={() => setActiveTabDetail('chat')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTabDetail === 'chat' ? '2px solid #0051c3' : '2px solid transparent',
                  color: activeTabDetail === 'chat' ? '#0051c3' : '#6b7280',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                💬 Lịch sử trao đổi chat ({contractDetail?.recentChatMessages?.length || 0})
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                  ⏳ Đang tải dữ liệu chi tiết...
                </div>
              ) : activeTabDetail === 'deliverables' ? (
                <div>
                  {contractDetail?.deliverables?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>
                      Sinh viên chưa nộp sản phẩm nào cho hợp đồng này.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {contractDetail?.deliverables?.map((del) => (
                        <div
                          key={del.id}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            padding: 14,
                            background: '#f9fafb',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>
                              Phiên bản v{del.version}
                            </span>
                            <span className="cf-status-pill" style={{ fontSize: 11 }}>
                              {del.status}
                            </span>
                          </div>

                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            Thời điểm nộp: <b>{formatDate(del.submittedAt)}</b>
                          </div>

                          {del.studentNotes && (
                            <div style={{ fontSize: 13, color: '#374151', background: '#ffffff', padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', marginBottom: 8 }}>
                              <b>Ghi chú từ Sinh viên:</b> {del.studentNotes}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {del.fileUrl && (
                              <a
                                href={del.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 12.5,
                                  color: '#0051c3',
                                  textDecoration: 'none',
                                  background: '#eff6ff',
                                  padding: '5px 10px',
                                  borderRadius: 5,
                                  border: '1px solid #bfdbfe',
                                }}
                              >
                                📥 Tải / Xem tập tin đính kèm
                              </a>
                            )}
                            {del.externalLink && (
                              <a
                                href={del.externalLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 12.5,
                                  color: '#15803d',
                                  textDecoration: 'none',
                                  background: '#f0fdf4',
                                  padding: '5px 10px',
                                  borderRadius: 5,
                                  border: '1px solid #bbf7d0',
                                }}
                              >
                                🔗 Mở liên kết ngoài (Drive / Figma / Github)
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {contractDetail?.recentChatMessages?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#6b7280', fontSize: 13 }}>
                      Không có tin nhắn nào được ghi nhận trên nền tảng.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {contractDetail?.recentChatMessages?.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            padding: '10px 12px',
                            background: '#f9fafb',
                            border: '1px solid #f3f4f6',
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6b7280', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: '#111827' }}>{msg.senderName}</span>
                            <span>{formatDate(msg.sentAt)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>
                            {msg.messageText}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#f9fafb',
              }}
            >
              <button
                className="cf-btn-secondary"
                onClick={() => setSelectedContractId(null)}
                style={{ padding: '6px 14px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận Cưỡng chế 2 bước (Force Action Safety Modal) */}
      {forceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 10,
              width: '100%',
              maxWidth: 540,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>
                {forceModal.actionType === 'release' ? '🛡️' : '⚠️'}
              </span>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                {forceModal.actionType === 'release'
                  ? 'Cưỡng chế Giải ngân Escrow cho Sinh viên'
                  : 'Cưỡng chế Hoàn cọc Escrow cho Nhà tuyển dụng'}
              </h3>
            </div>

            <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, marginBottom: 16 }}>
              Hợp đồng: <b>#{forceModal.contract.id} — {forceModal.contract.title}</b>
              <br />
              Số tiền ký quỹ: <b style={{ color: '#0051c3' }}>{fmtVND(forceModal.contract.escrowAmount)}</b>
              <br />
              {forceModal.actionType === 'release' ? (
                <span style={{ color: '#b91c1c' }}>
                  * Lưu ý: Tiền ký quỹ (trừ 10% phí sàn) sẽ được cộng vào số dư của Sinh viên. Nhà tuyển dụng sẽ bị trừ 10 điểm uy tín.
                </span>
              ) : (
                <span style={{ color: '#b91c1c' }}>
                  * Lưu ý: Toàn bộ tiền ký quỹ 100% sẽ được hoàn về số dư của Nhà tuyển dụng. Sinh viên sẽ bị trừ 15 điểm uy tín.
                </span>
              )}
            </div>

            {forceModal.contract.escrowAmount > 5000000 && (
              <div
                style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: 6,
                  padding: '10px 14px',
                  color: '#6d28d9',
                  fontSize: 12.5,
                  marginBottom: 16,
                }}
              >
                ℹ️ <b>Quy tắc Maker-Checker:</b> Giá trị ký quỹ vượt quá 5.000.000 VNĐ. Lệnh cưỡng chế này sẽ chuyển sang trạng thái <b>Chờ Checker duyệt bước 2</b> trước khi tiền được chuyển.
              </div>
            )}

            {actionError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  padding: '8px 12px',
                  color: '#b91c1c',
                  fontSize: 12.5,
                  marginBottom: 14,
                }}
              >
                ⚠️ {actionError}
              </div>
            )}

            {/* Input Reason */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Căn cứ & Lý do cưỡng chế (Tối thiểu 10 ký tự) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nêu rõ căn cứ vi phạm SLA hoặc thỏa thuận giữa 2 bên..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: reason.length < 10 ? '#dc2626' : '#6b7280', marginTop: 2 }}>
                {reason.length}/10 ký tự tối thiểu
              </div>
            </div>

            {/* Input Confirm Phrase */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Gõ chính xác cụm từ <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: '#dc2626' }}>XAC NHAN</code> để mở khóa:
              </label>
              <input
                type="text"
                placeholder="XAC NHAN"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="cf-btn-secondary"
                onClick={() => setForceModal(null)}
                disabled={isSubmitting}
                style={{ padding: '7px 14px' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteForceAction}
                disabled={
                  isSubmitting ||
                  reason.trim().length < 10 ||
                  confirmPhrase.trim().toUpperCase() !== 'XAC NHAN'
                }
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    isSubmitting ||
                    reason.trim().length < 10 ||
                    confirmPhrase.trim().toUpperCase() !== 'XAC NHAN'
                      ? 'not-allowed'
                      : 'pointer',
                  background:
                    isSubmitting ||
                    reason.trim().length < 10 ||
                    confirmPhrase.trim().toUpperCase() !== 'XAC NHAN'
                      ? '#9ca3af'
                      : forceModal.actionType === 'release'
                      ? '#16a34a'
                      : '#dc2626',
                  color: '#ffffff',
                }}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận thi hành'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
