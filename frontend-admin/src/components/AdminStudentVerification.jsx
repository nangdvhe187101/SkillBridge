import React, { useState, useEffect, useMemo } from 'react';
import { getPendingStudentVerifications, reviewStudentVerification } from '../api/adminApi';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import Pagination from './Pagination';

export default function AdminStudentVerification() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReq, setSelectedReq] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Review action modal state
  const [actionType, setActionType] = useState('approve'); // 'approve' | 'need_more_info' | 'reject'
  const [reasonCode, setReasonCode] = useState('BLURRY_IMAGE');
  const [userMessage, setUserMessage] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [enlargedImage, setEnlargedImage] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await getPendingStudentVerifications();
      setRequests(Array.isArray(res) ? res : []);
    } catch (err) {
      showToast(err?.message || 'Không thể tải danh sách hồ sơ xác minh sinh viên.', 'x');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r) =>
        r.studentCode?.toLowerCase().includes(q) ||
        r.fullNameOnCard?.toLowerCase().includes(q) ||
        r.schoolName?.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const pagedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const handleOpenReview = (req) => {
    setSelectedReq(req);
    setActionType('approve');
    setReasonCode('BLURRY_IMAGE');
    setUserMessage('');
    setAdminNote('');
  };

  const handleCloseReview = () => {
    setSelectedReq(null);
  };

  const handleActionTypeChange = (type) => {
    setActionType(type);
    if (type === 'need_more_info') {
      setReasonCode('BLURRY_IMAGE');
      setUserMessage('Ảnh chụp thẻ sinh viên bị mờ hoặc chói sáng. Vui lòng chụp lại rõ nét cả 2 mặt thẻ.');
    } else if (type === 'reject') {
      setReasonCode('INVALID_STUDENT_CARD');
      setUserMessage('Thẻ sinh viên không hợp lệ hoặc thông tin không trùng khớp với hệ thống.');
    } else {
      setUserMessage('');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedReq) return;

    if (actionType !== 'approve' && !userMessage.trim()) {
      showToast('Vui lòng nhập lý do/lời nhắn giải thích cho sinh viên.', 'x');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        decision: actionType,
        reasonCode: actionType === 'approve' ? null : reasonCode,
        userMessage: actionType === 'approve' ? null : userMessage.trim(),
        adminNote: adminNote.trim() || null,
        needInfoDeadlineDays: actionType === 'need_more_info' ? 7 : null
      };

      await reviewStudentVerification(selectedReq.id, payload);
      showToast(
        actionType === 'approve'
          ? 'Đã phê duyệt hồ sơ thẻ sinh viên thành công!'
          : actionType === 'need_more_info'
          ? 'Đã gửi yêu cầu bổ sung thông tin cho sinh viên.'
          : 'Đã từ chối hồ sơ xác minh.',
        'check'
      );
      handleCloseReview();
      fetchList();
    } catch (err) {
      showToast(err?.message || 'Có lỗi xảy ra khi xử lý hồ sơ.', 'x');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adm-panel">
      {/* Header bar */}
      <div className="adm-panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="shield-check" style={{ color: 'var(--primary)' }} /> Duyệt Thẻ Sinh Viên
            <span style={{ fontSize: 13, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              {requests.length} hồ sơ chờ duyệt
            </span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            Cam kết hoàn tất xét duyệt trong vòng 24 giờ làm việc. Đối soát MSSV, họ tên và ảnh chụp 2 mặt thẻ.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            className="adm-input"
            placeholder="Tìm theo MSSV, Họ tên, Trường..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: 260, fontSize: 13 }}
          />
          <button className="btn btn-secondary btn-sm" onClick={fetchList} title="Làm mới danh sách">
            <Icon name="refresh" /> Làm mới
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="adm-card" style={{ marginTop: 16 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-soft)' }}>
            <span className="adm-spinner" /> Đang tải danh sách hồ sơ...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-soft)' }}>
            <Icon name="check" style={{ width: 36, height: 36, color: '#10b981', marginBottom: 8 }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>Hàng chờ duyệt hiện đang trống!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>Toàn bộ hồ sơ xác minh thẻ sinh viên đã được xử lý kịp thời.</p>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sinh viên</th>
                  <th>Trường Đại học</th>
                  <th>MSSV</th>
                  <th>Năm tốt nghiệp</th>
                  <th>Ảnh thẻ</th>
                  <th>Thời gian gửi</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.map((req) => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{req.fullNameOnCard || 'Chưa cập nhật'}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>User ID: {req.userId}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{req.schoolName || 'Đại học FPT'}</span>
                    </td>
                    <td>
                      <code style={{ padding: '2px 6px', background: 'var(--surface-sunken)', borderRadius: 4, fontWeight: 600 }}>
                        {req.studentCode}
                      </code>
                    </td>
                    <td>
                      <span>{req.graduationYear || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {req.frontCardUrl && (
                          <img
                            src={req.frontCardUrl}
                            alt="Mặt trước"
                            title="Bấm để xem ảnh mặt trước"
                            onClick={() => setEnlargedImage(req.frontCardUrl)}
                            style={{ width: 44, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', cursor: 'pointer' }}
                          />
                        )}
                        {req.backCardUrl && (
                          <img
                            src={req.backCardUrl}
                            alt="Mặt sau"
                            title="Bấm để xem ảnh mặt sau"
                            onClick={() => setEnlargedImage(req.backCardUrl)}
                            style={{ width: 44, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', cursor: 'pointer' }}
                          />
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {req.submittedAt ? new Date(req.submittedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenReview(req)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Icon name="eye" /> Duyệt hồ sơ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={filteredRequests.length}
            />
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReq && (
        <div className="adm-modal-backdrop" onClick={handleCloseReview}>
          <div
            className="adm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 900, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="adm-modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Xét duyệt thẻ sinh viên #{selectedReq.id} · {selectedReq.fullNameOnCard}
              </h3>
              <button className="adm-icon-btn" onClick={handleCloseReview}>✕</button>
            </div>

            <div className="adm-modal-body" style={{ overflowY: 'auto', padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left Column: Card Images */}
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Ảnh Thẻ Sinh Viên (2 mặt)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>Mặt trước:</div>
                      {selectedReq.frontCardUrl ? (
                        <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                          <img
                            src={selectedReq.frontCardUrl}
                            alt="Mặt trước thẻ"
                            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', cursor: 'zoom-in', display: 'block' }}
                            onClick={() => setEnlargedImage(selectedReq.frontCardUrl)}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: 24, textAlign: 'center', background: 'var(--surface-sunken)', borderRadius: 8, color: 'var(--ink-soft)', fontSize: 12 }}>
                          Chưa có ảnh mặt trước
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>Mặt sau:</div>
                      {selectedReq.backCardUrl ? (
                        <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                          <img
                            src={selectedReq.backCardUrl}
                            alt="Mặt sau thẻ"
                            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', cursor: 'zoom-in', display: 'block' }}
                            onClick={() => setEnlargedImage(selectedReq.backCardUrl)}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: 24, textAlign: 'center', background: 'var(--surface-sunken)', borderRadius: 8, color: 'var(--ink-soft)', fontSize: 12 }}>
                          Chưa có ảnh mặt sau
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Data & Review Decision */}
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Thông tin đối soát</h4>
                  <div style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', fontSize: 13 }}>
                      <span style={{ color: 'var(--ink-soft)' }}>Họ và tên:</span>
                      <strong style={{ color: 'var(--ink)' }}>{selectedReq.fullNameOnCard}</strong>

                      <span style={{ color: 'var(--ink-soft)' }}>Trường đào tạo:</span>
                      <strong>{selectedReq.schoolName || 'Đại học FPT'}</strong>

                      <span style={{ color: 'var(--ink-soft)' }}>Mã số SV:</span>
                      <strong style={{ color: 'var(--primary)' }}>{selectedReq.studentCode}</strong>

                      <span style={{ color: 'var(--ink-soft)' }}>Năm tốt nghiệp:</span>
                      <strong>{selectedReq.graduationYear || '—'} (Hết hạn: 31/12/{selectedReq.graduationYear})</strong>

                      <span style={{ color: 'var(--ink-soft)' }}>Thời gian nộp:</span>
                      <span>{selectedReq.submittedAt ? new Date(selectedReq.submittedAt).toLocaleString('vi-VN') : '—'}</span>
                    </div>
                  </div>

                  {/* Decision Options */}
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Quyết định xử lý</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() => handleActionTypeChange('approve')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: actionType === 'approve' ? '2px solid #10b981' : '1px solid var(--border)',
                        background: actionType === 'approve' ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)',
                        color: actionType === 'approve' ? '#059669' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Phê duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionTypeChange('need_more_info')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: actionType === 'need_more_info' ? '2px solid #f59e0b' : '1px solid var(--border)',
                        background: actionType === 'need_more_info' ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface)',
                        color: actionType === 'need_more_info' ? '#d97706' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      ⚠ Bổ sung
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionTypeChange('reject')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 8,
                        border: actionType === 'reject' ? '2px solid #ef4444' : '1px solid var(--border)',
                        background: actionType === 'reject' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
                        color: actionType === 'reject' ? '#dc2626' : 'var(--ink)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Từ chối
                    </button>
                  </div>

                  {/* Dynamic fields based on action */}
                  {actionType !== 'approve' && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                        Lý do chuẩn hóa:
                      </label>
                      <select
                        className="adm-input"
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        style={{ width: '100%', fontSize: 13, marginBottom: 10 }}
                      >
                        {actionType === 'need_more_info' ? (
                          <>
                            <option value="BLURRY_IMAGE">Ảnh thẻ bị mờ / Chói sáng / Mất góc</option>
                            <option value="MISSING_BACK_SIDE">Thiếu ảnh mặt sau thẻ sinh viên</option>
                            <option value="NAME_MISMATCH">Họ tên trên thẻ không trùng với hồ sơ</option>
                            <option value="STUDENT_CODE_UNCLEAR">Không nhìn rõ Mã số sinh viên</option>
                            <option value="OTHER_SUPPLEMENT">Yêu cầu bổ sung tài liệu chứng minh khác</option>
                          </>
                        ) : (
                          <>
                            <option value="INVALID_STUDENT_CARD">Thẻ sinh viên không hợp lệ / Hết hạn</option>
                            <option value="SUSPECTED_FRAUD">Nghi vấn làm giả / Can thiệp chỉnh sửa ảnh</option>
                            <option value="DUPLICATE_STUDENT_CODE">MSSV này đã được xác minh bởi tài khoản khác</option>
                            <option value="UNSUPPORTED_SCHOOL">Trường đào tạo không thuộc danh sách hỗ trợ</option>
                            <option value="OTHER_REJECT">Lý do khác từ chối vĩnh viễn</option>
                          </>
                        )}
                      </select>

                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                        Thông điệp gửi tới sinh viên (bắt buộc):
                      </label>
                      <textarea
                        className="adm-input"
                        rows={3}
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        placeholder="Giải thích cụ thể để sinh viên biết cần làm gì..."
                        style={{ width: '100%', fontSize: 13 }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                      Ghi chú nội bộ Admin (tùy chọn):
                    </label>
                    <input
                      type="text"
                      className="adm-input"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Ghi chú nội bộ cho ban quản trị..."
                      style={{ width: '100%', fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="adm-modal-foot" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleCloseReview} disabled={submitting}>
                Hủy
              </button>
              <button
                className={`btn ${actionType === 'approve' ? 'btn-primary' : actionType === 'need_more_info' ? 'btn-warning' : 'btn-danger'} btn-sm`}
                onClick={handleSubmitReview}
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : actionType === 'approve' ? 'Xác nhận Phê duyệt' : actionType === 'need_more_info' ? 'Gửi yêu cầu Bổ sung' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {enlargedImage && (
        <div
          className="adm-modal-backdrop"
          onClick={() => setEnlargedImage(null)}
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={enlargedImage}
              alt="Phóng to ảnh thẻ"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => setEnlargedImage(null)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
