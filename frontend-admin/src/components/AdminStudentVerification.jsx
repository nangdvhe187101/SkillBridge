import React, { useState, useEffect, useMemo } from 'react';
import { getPendingStudentVerifications, reviewStudentVerification, getAdminSchools, runStudentCardOcr } from '../api/adminApi';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';
import Pagination from './Pagination';

import { getAccessToken } from '../api/tokenStore';

function getAuthToken() {
  let token = getAccessToken();
  if (!token && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('admin_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        token = parsed?.token || null;
      }
    } catch { }
  }
  return token;
}

function getCardImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

  const isClientProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const defaultApiUrl = isClientProd ? 'https://api.skillbridge.id.vn/api' : 'http://localhost:5005/api';
  const envApiUrl = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || defaultApiUrl;
  const backendBaseUrl = (isClientProd && envApiUrl.includes('localhost') ? 'https://api.skillbridge.id.vn' : envApiUrl).replace(/\/api\/?$/, '');

  let targetUrl = trimmed;

  // 1. Chuyển đổi localhost sang domain production nếu đang truy cập trên production
  if (isClientProd && /https?:\/\/localhost(:\d+)?/i.test(targetUrl)) {
    targetUrl = targetUrl.replace(/https?:\/\/localhost(:\d+)?/i, 'https://api.skillbridge.id.vn');
  }

  // 2. Chuẩn hóa đường dẫn tương đối hoặc storage key
  if (targetUrl.startsWith('/api/storage')) {
    targetUrl = `${backendBaseUrl}${targetUrl}`;
  } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    if (targetUrl.startsWith('identity_documents/')) {
      targetUrl = `${backendBaseUrl}/api/storage/file?key=${encodeURIComponent(targetUrl)}`;
    } else {
      targetUrl = `${backendBaseUrl}${targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`}`;
    }
  }

  // 3. Tự động đính kèm access_token cho các tệp giấy tờ định danh bảo mật (Nghị định 13/2023/NĐ-CP & SEC-02)
  if (targetUrl.includes('identity_documents') || targetUrl.includes('/api/storage/file')) {
    const token = getAuthToken();
    if (token && !targetUrl.includes('access_token=')) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${sep}access_token=${encodeURIComponent(token)}`;
    }
  }

  return targetUrl;
}

export default function AdminStudentVerification() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [schools, setSchools] = useState([]);
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

  // Editable verification data on review
  const [editFullName, setEditFullName] = useState('');
  const [editSchoolId, setEditSchoolId] = useState('');
  const [editStudentCode, setEditStudentCode] = useState('');
  const [editGraduationYear, setEditGraduationYear] = useState('');

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchList = async () => {
    setLoading(true);
    try {
      const [res, schoolRes] = await Promise.all([
        getPendingStudentVerifications(),
        getAdminSchools().catch(() => [])
      ]);
      setRequests(Array.isArray(res) ? res : []);
      window.dispatchEvent(new CustomEvent('admin-badges-refresh'));
      if (Array.isArray(schoolRes) && schoolRes.length > 0) {
        setSchools(schoolRes);
      }
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
        r.userEmail?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
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
    setEditFullName(req.fullNameOnCard || req.userName || '');
    setEditSchoolId(req.schoolId ? String(req.schoolId) : (schools[0]?.id ? String(schools[0].id) : ''));
    setEditStudentCode(req.studentCode && req.studentCode !== 'CHỜ_DUYỆT' ? req.studentCode : '');
    setEditGraduationYear(req.graduationYear ? String(req.graduationYear) : String(new Date().getFullYear() + 2));

    // Kiểm tra xem đã có kết quả OCR sẵn chưa
    if (req.ocrResultJson) {
      try {
        const parsed = JSON.parse(req.ocrResultJson);
        setOcrData(parsed);
        if (parsed.studentCode && (!req.studentCode || req.studentCode === 'CHỜ_DUYỆT')) {
          setEditStudentCode(parsed.studentCode);
        }
        if (parsed.fullName) setEditFullName(parsed.fullName);
        if (parsed.graduationYear) setEditGraduationYear(String(parsed.graduationYear));
        if (parsed.schoolId) setEditSchoolId(String(parsed.schoolId));
      } catch {
        setOcrData(null);
      }
    } else {
      setOcrData(null);
    }
  };

  const handleCloseReview = () => {
    setSelectedReq(null);
    setOcrData(null);
  };

  const handleRunOcr = async () => {
    if (!selectedReq) return;
    setOcrLoading(true);
    try {
      const res = await runStudentCardOcr(selectedReq.id);
      if (res && res.success) {
        setOcrData(res);
        if (res.studentCode) setEditStudentCode(res.studentCode);
        if (res.fullName) setEditFullName(res.fullName);
        if (res.graduationYear) setEditGraduationYear(String(res.graduationYear));
        if (res.schoolId) setEditSchoolId(String(res.schoolId));
        showToast('Đã quét và trích xuất thông tin thẻ sinh viên thành công!', 'check');
      } else {
        showToast(res?.error || 'Không trích xuất được thông tin từ ảnh.', 'x');
      }
    } catch (err) {
      showToast(err?.message || 'Lỗi khi thực hiện OCR thẻ sinh viên.', 'x');
    } finally {
      setOcrLoading(false);
    }
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

    if (actionType === 'approve') {
      if (!editStudentCode.trim()) {
        showToast('Vui lòng nhập Mã số sinh viên đối soát theo thẻ.', 'x');
        return;
      }
      if (!editFullName.trim()) {
        showToast('Vui lòng nhập Họ và tên sinh viên trên thẻ.', 'x');
        return;
      }
      if (!editSchoolId) {
        showToast('Vui lòng chọn Trường đại học của sinh viên.', 'x');
        return;
      }
      if (!editGraduationYear) {
        showToast('Vui lòng nhập Năm tốt nghiệp dự kiến.', 'x');
        return;
      }
    } else if (actionType === 'need_more_info' || actionType === 'reject') {
      if (!userMessage.trim()) {
        showToast('Vui lòng nhập lý do giải thích cho sinh viên.', 'x');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        decision: actionType,
        studentCode: actionType === 'approve' ? editStudentCode.trim().toUpperCase() : null,
        fullNameOnCard: actionType === 'approve' ? editFullName.trim() : null,
        schoolId: actionType === 'approve' && editSchoolId ? Number(editSchoolId) : null,
        graduationYear: actionType === 'approve' ? Number(editGraduationYear) : null,
        reasonCode: actionType === 'approve' ? null : reasonCode,
        userMessage: actionType === 'approve' ? null : userMessage.trim(),
        adminNote: adminNote.trim() || null,
        needInfoDeadlineDays: actionType === 'need_more_info' ? 7 : null
      };

      await reviewStudentVerification(selectedReq.id, payload);
      showToast(
        actionType === 'approve'
          ? 'Đã phê duyệt hồ sơ thẻ sinh viên và cập nhật thông tin thành công!'
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
    <div>
      {/* Header bar phong cách Cloudflare */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#111827' }}>
            <Icon name="shield-check" width={20} height={20} style={{ color: '#0051c3' }} />
            <span>Duyệt Thẻ Sinh Viên & Đối Soát MSSV</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(0, 81, 195, 0.1)', color: '#0051c3' }}>
              {requests.length} hồ sơ chờ duyệt
            </span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            Hệ thống hỗ trợ AI OCR trích xuất thông tin tự động từ thẻ sinh viên để Quản trị viên đối chiếu và phê duyệt.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="Tìm theo Email, MSSV, Tên, Trường..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: 290,
              padding: '7px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 13,
              outline: 'none',
              background: '#fff'
            }}
          />
          <button
            className="cf-btn-secondary"
            onClick={fetchList}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 13 }}
            title="Làm mới danh sách"
          >
            <Icon name="refresh" width={14} height={14} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            Đang tải danh sách hồ sơ...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', marginBottom: 12 }}>
              <Icon name="check" width={22} height={22} />
            </div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#111827' }}>Hàng chờ duyệt hiện đang trống!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Toàn bộ hồ sơ xác minh thẻ sinh viên đã được xử lý kịp thời.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cf-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>ID</th>
                  <th>Tài khoản sinh viên</th>
                  <th>Trường dự kiến</th>
                  <th>Mã số sinh viên</th>
                  <th>Năm tốt nghiệp</th>
                  <th>Ảnh thẻ</th>
                  <th>Thời gian gửi</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedRequests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600, color: '#6b7280' }}>#{req.id}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0051c3', fontSize: 13.5 }}>
                        {req.userEmail || `User #${req.userId}`}
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 1 }}>
                        {req.userName || req.fullNameOnCard || 'Chưa cập nhật tên'}
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>(Tên đăng ký)</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{req.schoolName || 'Chờ đối soát'}</span>
                    </td>
                    <td>
                      {req.studentCode && req.studentCode !== 'CHỜ_DUYỆT' ? (
                        <code style={{ padding: '2px 6px', background: '#eff6ff', borderRadius: 4, fontWeight: 700, color: '#1d4ed8' }}>
                          {req.studentCode}
                        </code>
                      ) : (
                        <span style={{ fontSize: 12, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>
                          Chờ Admin cấp
                        </span>
                      )}
                    </td>
                    <td>
                      <span>{req.graduationYear ? `Năm ${req.graduationYear}` : '—'}</span>
                    </td>
                    <td>
                      {req.frontCardUrl ? (
                        <div style={{ position: 'relative', width: 56, height: 36 }}>
                          <img
                            src={getCardImageUrl(req.frontCardUrl)}
                            alt="Thẻ sinh viên"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #d1d5db',
                              cursor: 'pointer',
                              display: 'block'
                            }}
                            onClick={() => setEnlargedImage(getCardImageUrl(req.frontCardUrl))}
                            title="Bấm để phóng to xem thẻ"
                          />
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>Chưa có</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {req.submittedAt ? new Date(req.submittedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="cf-btn-primary"
                        style={{
                          padding: '6px 12px',
                          fontSize: 12.5,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onClick={() => handleOpenReview(req)}
                      >
                        <Icon name="shield-check" width={14} height={14} />
                        <span>Xét duyệt & OCR</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal Xét duyệt & OCR Phân tích */}
      {selectedReq && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={handleCloseReview}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Đối Soát & Duyệt Thẻ Sinh Viên</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3' }}>
                    Hồ sơ #{selectedReq.id}
                  </span>
                </h3>
                <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
                  Tài khoản: <b style={{ color: '#0284c7' }}>{selectedReq.userEmail}</b> (ID: {selectedReq.userId})
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseReview}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 18, padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body - 2 Columns (Trái: Ảnh thẻ, Phải: Đối soát & OCR) */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)', gap: 20 }}>
              
              {/* CỘT TRÁI: Ảnh thẻ sinh viên */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                    📷 Ảnh Thẻ Sinh Viên Cung Cấp
                  </label>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Bấm vào ảnh để phóng to</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Mặt trước */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, background: '#f1f5f9' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Mặt trước thẻ:
                    </div>
                    {selectedReq.frontCardUrl ? (
                      <div
                        style={{ position: 'relative', background: '#0f172a', borderRadius: 6, overflow: 'hidden', cursor: 'zoom-in', textAlign: 'center' }}
                        onClick={() => setEnlargedImage(getCardImageUrl(selectedReq.frontCardUrl))}
                      >
                        <img
                          src={getCardImageUrl(selectedReq.frontCardUrl)}
                          alt="Mặt trước thẻ"
                          style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }}
                        />
                        <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                          🔍 Phóng to
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Không có ảnh mặt trước</div>
                    )}
                  </div>

                  {/* Mặt sau (nếu có) */}
                  {selectedReq.backCardUrl && (
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, background: '#f1f5f9' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                        Mặt sau thẻ:
                      </div>
                      <div
                        style={{ position: 'relative', background: '#0f172a', borderRadius: 6, overflow: 'hidden', cursor: 'zoom-in', textAlign: 'center' }}
                        onClick={() => setEnlargedImage(getCardImageUrl(selectedReq.backCardUrl))}
                      >
                        <img
                          src={getCardImageUrl(selectedReq.backCardUrl)}
                          alt="Mặt sau thẻ"
                          style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }}
                        />
                        <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                          🔍 Phóng to
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nút quét OCR */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#166534' }}>
                        ⚡ AI OCR Trích Xuất Dữ Liệu
                      </span>
                      {ocrData && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                          ✓ Đã quét
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: '#15803d', lineHeight: 1.4 }}>
                      Tự động phân tích ảnh thẻ để trích xuất MSSV, Họ tên, Trường và Niên khóa điền vào các ô đối soát.
                    </p>
                    <button
                      type="button"
                      onClick={handleRunOcr}
                      disabled={ocrLoading}
                      className="cf-btn-primary"
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#16a34a',
                        borderColor: '#16a34a'
                      }}
                    >
                      {ocrLoading ? (
                        <>
                          <Icon name="refresh" width={14} height={14} className="adm-spinner" />
                          <span>Đang nhận diện ký tự (OCR)...</span>
                        </>
                      ) : (
                        <>
                          <span>🔍 Quét OCR Thẻ Sinh Viên</span>
                        </>
                      )}
                    </button>

                    {ocrData?.rawLines && ocrData.rawLines.length > 0 && (
                      <details style={{ marginTop: 8, fontSize: 11.5, color: '#166534' }}>
                        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Xem các dòng OCR nhận diện được ({ocrData.rawLines.length})</summary>
                        <div style={{ marginTop: 6, padding: 8, background: '#fff', borderRadius: 4, border: '1px solid #bbf7d0', maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace' }}>
                          {ocrData.rawLines.map((line, idx) => (
                            <div key={idx}>{idx + 1}. {line}</div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: Form đối soát & quyết định */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 8 }}>
                  📝 Thông Tin Đối Soát Chính Thức (Admin kiểm tra & chuẩn hóa)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  {/* Họ tên trên thẻ */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Họ và tên trên thẻ sinh viên <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="Nhập họ và tên trên thẻ..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  {/* Trường Đại học */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Trường Đại học / Cao đẳng <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={editSchoolId}
                      onChange={(e) => setEditSchoolId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 13,
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    >
                      <option value="">-- Chọn trường học --</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.shortName ? `(${s.shortName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mã số sinh viên & Năm tốt nghiệp */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Mã số sinh viên (MSSV) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editStudentCode}
                        onChange={(e) => setEditStudentCode(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: HE191183..."
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1.5px solid #0051c3',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0051c3',
                          letterSpacing: '0.5px',
                          background: '#fff'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                        Năm tốt nghiệp <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="2020"
                        max="2040"
                        value={editGraduationYear}
                        onChange={(e) => setEditGraduationYear(e.target.value)}
                        placeholder="Ví dụ: 2027"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 13,
                          color: '#0f172a',
                          background: '#fff'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quyết định xét duyệt */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 8 }}>
                    ⚖️ Quyết Định Xét Duyệt
                  </label>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => handleActionTypeChange('approve')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: actionType === 'approve' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: actionType === 'approve' ? '#ecfdf5' : '#fff',
                        color: actionType === 'approve' ? '#166534' : '#475569',
                        fontWeight: actionType === 'approve' ? 700 : 500,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Phê duyệt thẻ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionTypeChange('need_more_info')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: actionType === 'need_more_info' ? '2px solid #d97706' : '1px solid #cbd5e1',
                        background: actionType === 'need_more_info' ? '#fffbeb' : '#fff',
                        color: actionType === 'need_more_info' ? '#92400e' : '#475569',
                        fontWeight: actionType === 'need_more_info' ? 700 : 500,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      ⚠️ Yêu cầu bổ sung
                    </button>
                    <button
                      type="button"
                      onClick={() => handleActionTypeChange('reject')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 6,
                        border: actionType === 'reject' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        background: actionType === 'reject' ? '#fef2f2' : '#fff',
                        color: actionType === 'reject' ? '#991b1b' : '#475569',
                        fontWeight: actionType === 'reject' ? 700 : 500,
                        fontSize: 12.5,
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Từ chối
                    </button>
                  </div>

                  {/* Form giải thích khi Bổ sung hoặc Từ chối */}
                  {(actionType === 'need_more_info' || actionType === 'reject') && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                        Lý do giải thích cho sinh viên:
                      </label>
                      <textarea
                        rows={3}
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        placeholder="Nhập lý do gửi đến sinh viên..."
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 6,
                          border: '1px solid #fcd34d',
                          fontSize: 12.5,
                          color: '#78350f',
                          background: '#fff'
                        }}
                      />
                    </div>
                  )}

                  {/* Ghi chú nội bộ Admin */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                      Ghi chú nội bộ Admin (Tùy chọn):
                    </label>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Ghi chú riêng của kiểm duyệt viên..."
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        fontSize: 12.5,
                        color: '#334155',
                        background: '#fff'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="cf-btn-secondary"
                onClick={handleCloseReview}
                disabled={submitting}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="cf-btn-primary"
                onClick={handleSubmitReview}
                disabled={submitting}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  background: actionType === 'approve' ? '#16a34a' : actionType === 'need_more_info' ? '#d97706' : '#dc2626',
                  borderColor: actionType === 'approve' ? '#16a34a' : actionType === 'need_more_info' ? '#d97706' : '#dc2626'
                }}
              >
                {submitting ? 'Đang lưu kết quả...' : actionType === 'approve' ? 'Xác nhận Phê duyệt Thẻ' : actionType === 'need_more_info' ? 'Gửi Yêu cầu Bổ sung' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Phóng to ảnh thẻ */}
      {enlargedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={() => setEnlargedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage}
              alt="Ảnh thẻ phóng to"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', display: 'block' }}
            />
            <button
              type="button"
              onClick={() => setEnlargedImage(null)}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
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
