import React, { useState, useEffect } from 'react';
import {
  getAdminBankVerifications,
  getAdminBankVerificationDetail,
  approveBankVerification,
  rejectBankVerification
} from '../api/adminApi';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';

export default function AdminBankVerification() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Approve / Reject Form state
  const [bankReturnedName, setBankReturnedName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async (status = statusFilter) => {
    setLoading(true);
    try {
      const res = await getAdminBankVerifications(status, 1, 50);
      setRequests(res?.items || []);
    } catch (err) {
      showToast(err?.message || 'Không thể tải danh sách yêu cầu xác thực ngân hàng.', 'x');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(statusFilter);
  }, [statusFilter]);

  const handleOpenDetail = async (reqId) => {
    setSelectedReqId(reqId);
    setLoadingDetail(true);
    setShowRejectForm(false);
    setBankReturnedName('');
    setRejectionReason('');
    try {
      const data = await getAdminBankVerificationDetail(reqId);
      setDetail(data);
      // Gợi ý tên viết hoa từ hồ sơ nếu muốn
      setBankReturnedName(data?.normalizedUserName || '');
    } catch (err) {
      showToast(err?.message || 'Không thể tải chi tiết yêu cầu.', 'x');
      setSelectedReqId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedReqId(null);
    setDetail(null);
    setShowRejectForm(false);
  };

  const handleApprove = async () => {
    if (!bankReturnedName || !bankReturnedName.trim()) {
      showToast('Vui lòng nhập tên chủ tài khoản tra cứu từ app ngân hàng.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await approveBankVerification(selectedReqId, bankReturnedName.trim().toUpperCase());
      showToast('Đã duyệt xác thực tài khoản ngân hàng thành công!', 'check');
      handleCloseModal();
      fetchList();
    } catch (err) {
      showToast(err?.message || 'Không thể duyệt yêu cầu.', 'x');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || !rejectionReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối yêu cầu.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await rejectBankVerification(selectedReqId, rejectionReason.trim());
      showToast('Đã từ chối yêu cầu xác thực ngân hàng.', 'check');
      handleCloseModal();
      fetchList();
    } catch (err) {
      showToast(err?.message || 'Không thể từ chối yêu cầu.', 'x');
    } finally {
      setSubmitting(false);
    }
  };

  // So khớp tên cảnh báo
  const cleanInput = bankReturnedName ? bankReturnedName.trim().toUpperCase() : '';
  const cleanProfile = detail?.normalizedUserName ? detail.normalizedUserName.trim().toUpperCase() : '';
  const isNameMismatched = cleanInput && cleanProfile && cleanInput !== cleanProfile;

  return (
    <div className="adm-card" style={{ marginTop: 24, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
      <div className="adm-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <span style={{ color: '#f59e0b', display: 'flex' }}><Icon name="bank" width="18" height="18" /></span>
            <span>Yêu cầu xác thực tài khoản ngân hàng</span>
          </h4>
          <span className="sub" style={{ fontSize: 12 }}>
            Quy trình Admin duyệt tay: Quét QR qua app ngân hàng công ty để kiểm tra tên thụ hưởng khớp hồ sơ user (không phát sinh chuyển tiền).
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-card)' }}
          >
            <option value="pending">Chờ duyệt (Pending)</option>
            <option value="approved">Đã duyệt (Approved)</option>
            <option value="rejected">Bị từ chối (Rejected)</option>
            <option value="cancelled">Đã hủy (Cancelled)</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => fetchList()} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      <div className="adm-table-wrap" style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-soft)' }}>Đang tải danh sách...</div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ink-soft)' }}>
            Không có yêu cầu xác thực ngân hàng nào ({statusFilter}).
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Ngân hàng</th>
                <th>Số tài khoản (Mask)</th>
                <th>Thời gian gửi</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>
                    <b>{r.userName}</b>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)' }}>{r.userEmail}</span>
                  </td>
                  <td>
                    <span className="chip" style={{ fontSize: 11 }}>{r.bankName}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.accountNumberMask}</td>
                  <td style={{ fontSize: 12 }}>{new Date(r.submittedAt).toLocaleString('vi-VN')}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          r.status === 'pending'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : r.status === 'approved'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                        color:
                          r.status === 'pending'
                            ? '#d97706'
                            : r.status === 'approved'
                            ? '#16a34a'
                            : '#dc2626'
                      }}
                    >
                      {r.status === 'pending'
                        ? 'Chờ duyệt'
                        : r.status === 'approved'
                        ? 'Đã duyệt'
                        : r.status === 'rejected'
                        ? 'Từ chối'
                        : 'Đã hủy'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => handleOpenDetail(r.id)}
                    >
                      {r.status === 'pending' ? 'Đối soát & Duyệt' : 'Xem chi tiết'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CHI TIẾT & ĐỐI SOÁT */}
      {selectedReqId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: '#fff',
              color: '#1e293b',
              borderRadius: 16,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="bank" width="20" height="20" style={{ color: '#2563eb' }} />
                <span>Đối soát tài khoản ngân hàng #{selectedReqId}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>Đang giải mã và sinh mã QR...</div>
            ) : detail ? (
              <div>
                {detail.hasConflictWithOtherUser && (
                  <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: '#fff7ed',
                    border: '1px solid #fdba74',
                    color: '#c2410c',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                    <div>
                      <strong>CẢNH BÁO PHÁT HIỆN TRÙNG LẶP (CHỐNG SYBIL ATTACK):</strong>
                      <p style={{ margin: '4px 0 0', lineHeight: 1.4 }}>{detail.conflictWarning}</p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 20 }}>
                  {/* CỘT TRÁI: MÃ QR TỰ SINH CHUẨN VIETQR CHO ADMIN QUÉT */}
                  <div style={{ textAlign: 'center', background: '#f8fafc', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                      MÃ VIETQR ĐỐI SOÁT NHANH
                    </div>
                    {detail.qrCodeBase64 ? (
                      <div style={{ display: 'inline-block', background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                        <img
                          src={detail.qrCodeBase64}
                          alt="VietQR Tra Cứu"
                          style={{ width: 180, height: 180, display: 'block', margin: '0 auto' }}
                        />
                      </div>
                    ) : (
                      <div style={{ padding: 40, color: '#94a3b8' }}>Không có mã QR</div>
                    )}
                    <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 10, lineHeight: 1.4, margin: '10px 0 0' }}>
                      👉 Dùng app ngân hàng bất kỳ (MB, Vietcombank, TPBank...) quét mã này để tự động điền STK, xem tên hiện ra rồi thoát (không chuyển tiền).
                    </p>
                  </div>

                  {/* CỘT PHẢI: THÔNG TIN CHI TIẾT & SO KHỚP */}
                  <div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Họ và tên hồ sơ User</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{detail.userName}</span>
                      <span style={{ fontSize: 12, color: '#2563eb', marginLeft: 8, fontWeight: 600 }}>({detail.normalizedUserName})</span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Ngân hàng</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{detail.bankName} (Mã BIN: {detail.bankCode})</span>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Số tài khoản (STK đầy đủ đã giải mã)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0' }}>
                          {detail.accountNumber}
                        </span>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => {
                            navigator.clipboard.writeText(detail.accountNumber);
                            showToast('Đã sao chép số tài khoản!', 'check');
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                      <div>Ngày gửi: {new Date(detail.submittedAt).toLocaleString('vi-VN')}</div>
                      {detail.reviewedAt && <div>Ngày duyệt: {new Date(detail.reviewedAt).toLocaleString('vi-VN')}</div>}
                      {detail.reviewedByAdminName && <div>Người duyệt: <b>{detail.reviewedByAdminName}</b></div>}
                      {detail.bankReturnedName && <div>Tên NH tra được: <b>{detail.bankReturnedName}</b></div>}
                    </div>
                  </div>
                </div>

                {/* FORM DUYỆT HOẶC TỪ CHỐI (CHỈ KHI PENDING) */}
                {detail.status === 'pending' && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
                    {!showRejectForm ? (
                      <div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>
                            Tên chủ tài khoản tra cứu được từ App Ngân hàng <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: DAO VAN NANG"
                            value={bankReturnedName}
                            onChange={(e) => setBankReturnedName(e.target.value.toUpperCase())}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              fontSize: 14,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              color: '#0f172a',
                              background: '#fff'
                            }}
                          />
                          <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                            Bắt buộc ghi lại tên đọc được làm bằng chứng đã tra cứu chính xác từ ngân hàng.
                          </span>
                        </div>

                        {/* CẢNH BÁO NẾU TÊN KHÔNG TRÙNG KHỚP */}
                        {isNameMismatched && (
                          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', padding: '10px 14px', borderRadius: 8, fontSize: 12.5, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span>⚠️</span>
                            <div>
                              <b>Cảnh báo không trùng khớp 100%:</b> Tên tra cứu [<b>{cleanInput}</b>] khác với tên hồ sơ [<b>{cleanProfile}</b>]. Admin vẫn có quyền phê duyệt nếu đây là tên viết tắt hợp lệ.
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                          <button
                            className="btn btn-outline"
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => setShowRejectForm(true)}
                            disabled={submitting}
                          >
                            Từ chối yêu cầu
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                            onClick={handleApprove}
                            disabled={submitting || !bankReturnedName.trim()}
                          >
                            {submitting ? 'Đang xử lý...' : '✓ Duyệt xác thực (Chính chủ)'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* FORM TỪ CHỐI */
                      <div style={{ background: '#fef2f2', padding: 16, borderRadius: 10, border: '1px solid #fecaca' }}>
                        <h4 style={{ margin: '0 0 8px', color: '#991b1b', fontSize: 14 }}>Từ chối yêu cầu xác thực</h4>
                        <label style={{ display: 'block', fontSize: 12, color: '#7f1d1d', marginBottom: 4 }}>
                          Lý do từ chối (bắt buộc để gửi thông báo cho user):
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Ví dụ: Tên chủ tài khoản tại ngân hàng không trùng khớp với hồ sơ..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #fca5a5', fontSize: 13, background: '#fff', color: '#1e293b' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setShowRejectForm(false)}
                            disabled={submitting}
                          >
                            Quay lại
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                            onClick={handleReject}
                            disabled={submitting || !rejectionReason.trim()}
                          >
                            {submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
