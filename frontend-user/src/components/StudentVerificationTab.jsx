import { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { getSchools, getStudentVerificationStatus, submitStudentVerification, uploadStudentCard } from '../api/studentVerificationApi';
import { getAccessToken } from '../api/tokenStore';
import Icon from './Icon';

const CURRENT_YEAR = new Date().getFullYear();
const API_URL = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || 'http://localhost:5004/api';
const API_BASE = API_URL.replace(/\/api\/?$/, '');

function getMediaUrl(src) {
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('blob:') || src.startsWith('data:')) return src;
  
  const isClientProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  let targetUrl = src;
  if (isClientProd && /https?:\/\/localhost(:\d+)?/i.test(targetUrl)) {
    targetUrl = targetUrl.replace(/https?:\/\/localhost(:\d+)?/i, 'https://api.skillbridge.id.vn');
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
  }

  // Tự động đính kèm access_token cho các tệp giấy tờ định danh bảo mật (Nghị định 13/2023/NĐ-CP)
  if (targetUrl.includes('identity_documents') || targetUrl.includes('/api/storage/file')) {
    const token = getAccessToken();
    if (token && !targetUrl.includes('access_token=')) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${sep}access_token=${encodeURIComponent(token)}`;
    }
  }

  return targetUrl;
}

export default function StudentVerificationTab({ isEmployer: _isEmployer = false, currentUser = null }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusData, setStatusData] = useState(null);

  // Form State (View-only values fallback to statusData or currentUser)
  const [schoolId, setSchoolId] = useState(1);
  const [studentCode, setStudentCode] = useState('');
  const [fullNameOnCard, setFullNameOnCard] = useState('');
  const [graduationYear, setGraduationYear] = useState(CURRENT_YEAR + 2);

  // Card Files State
  const [frontCard, setFrontCard] = useState(null); // { url, previewUrl, hash, name }
  const [backCard, setBackCard] = useState(null);   // { url, previewUrl, hash, name }
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schoolsRes, statusRes] = await Promise.all([
        getSchools().catch(() => []),
        getStudentVerificationStatus().catch(() => null)
      ]);

      const loadedSchools = Array.isArray(schoolsRes) ? schoolsRes : [];

      setStatusData(statusRes);

      // Ưu tiên giá trị từ statusRes, fallback sang currentUser
      const resolvedSchoolId = statusRes?.schoolId || currentUser?.schoolId || (loadedSchools[0]?.id || 1);
      const resolvedStudentCode = statusRes?.studentCode || currentUser?.studentCode || '';
      const resolvedFullName = statusRes?.fullNameOnCard || currentUser?.fullName || '';
      const resolvedGradYear = statusRes?.graduationYear || currentUser?.graduationYear || (CURRENT_YEAR + 2);

      setSchoolId(resolvedSchoolId);
      setStudentCode(resolvedStudentCode);
      setFullNameOnCard(resolvedFullName);
      setGraduationYear(resolvedGradYear);

      if (statusRes?.frontCardUrl) {
        setFrontCard(prev => ({
          url: statusRes.frontCardUrl,
          previewUrl: prev?.previewUrl || null,
          name: prev?.name || 'Mặt trước thẻ đã nộp'
        }));
      }
      if (statusRes?.backCardUrl) {
        setBackCard(prev => ({
          url: statusRes.backCardUrl,
          previewUrl: prev?.previewUrl || null,
          name: prev?.name || 'Mặt sau thẻ đã nộp'
        }));
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin xác minh sinh viên:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCardUpload = async (e, side) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Chặn PDF theo nguyên tắc thiết kế v1.0
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      addToast('Hệ thống chỉ nhận file hình ảnh (JPG, PNG, WEBP). Vui lòng không tải file PDF.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type.toLowerCase())) {
      addToast('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WEBP.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('Dung lượng ảnh vượt quá giới hạn 10MB.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);

    if (side === 'front') {
      setUploadingFront(true);
      setFrontCard(prev => ({
        ...(prev || {}),
        previewUrl: localPreviewUrl,
        name: file.name
      }));
    } else {
      setUploadingBack(true);
      setBackCard(prev => ({
        ...(prev || {}),
        previewUrl: localPreviewUrl,
        name: file.name
      }));
    }

    try {
      const res = await uploadStudentCard(file);
      const cardObj = {
        url: res.fileUrl,
        previewUrl: localPreviewUrl,
        hash: res.fileSha256,
        name: file.name
      };

      if (side === 'front') {
        setFrontCard(cardObj);
        addToast('Đã tải lên ảnh mặt trước thẻ thành công!', 'success');
      } else {
        setBackCard(cardObj);
        addToast('Đã tải lên ảnh mặt sau thẻ thành công!', 'success');
      }
    } catch (err) {
      addToast(err?.message || 'Không thể tải lên ảnh thẻ sinh viên.', 'error');
      if (side === 'front') setFrontCard(null);
      else setBackCard(null);
    } finally {
      if (side === 'front') setUploadingFront(false);
      else setUploadingBack(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!frontCard?.url) {
      addToast('Vui lòng tải lên ảnh mặt trước thẻ sinh viên.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await submitStudentVerification({
        schoolId: Number(schoolId) || 1,
        studentCode: (studentCode && studentCode.trim()) ? studentCode.trim().toUpperCase() : 'CHỜ_DUYỆT',
        fullNameOnCard: (fullNameOnCard && fullNameOnCard.trim()) ? fullNameOnCard.trim() : (currentUser?.fullName || 'Sinh viên'),
        graduationYear: Number(graduationYear) || (CURRENT_YEAR + 2),
        frontCardUrl: frontCard.url,
        frontCardHash: frontCard.hash || null,
        backCardUrl: backCard?.url || null,
        backCardHash: backCard?.hash || null
      });

      addToast('Nộp hồ sơ xác minh thẻ sinh viên thành công! Quản trị viên sẽ đối soát thông tin trên thẻ và xét duyệt trong vòng 24 giờ.', 'success');
      await loadData();
    } catch (err) {
      addToast(err?.message || 'Có lỗi xảy ra khi nộp hồ sơ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-soft)' }}>
        <span className="adm-spinner" /> Đang tải thông tin xác minh...
      </div>
    );
  }

  const currentStatus = statusData?.status || 'unverified';
  const isVerified = currentStatus === 'approved' || currentUser?.kycStatus?.toLowerCase() === 'verified';

  return (
    <div className="acct-section">
      <div className="acct-section-head">
        <div>
          <h3>Xác Minh Thẻ Sinh Viên</h3>
          <p>
            Chứng minh tư cách sinh viên chính quy để mở khóa quyền ứng tuyển công việc, nhận thù lao và xuất hiện trong Danh bạ Sinh viên.
          </p>
        </div>
      </div>

      {/* 1. Trạng thái ĐÃ XÁC MINH (Approved / Verified) */}
      {currentStatus === 'approved' && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Icon name="check" style={{ width: 22, height: 22 }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#065f46' }}>
                Hồ Sơ Đã Được Xác Minh Tư Cách Sinh Viên
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#047857', lineHeight: 1.5 }}>
                Tài khoản của bạn đã được kiểm duyệt hợp lệ theo thẻ sinh viên trường <b>{statusData?.schoolName || currentUser?.school || 'nhà trường'}</b>.
                Bạn có toàn quyền ứng tuyển việc làm, nhận hợp đồng và rút tiền thù lao về tài khoản ngân hàng.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, background: 'rgba(255,255,255,0.7)', padding: 14, borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block' }}>Email tài khoản:</span>
                  <strong style={{ fontSize: 14, color: 'var(--primary)' }}>{currentUser?.email} 🔒</strong>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block' }}>Họ và tên:</span>
                  <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{statusData?.fullNameOnCard} 🔒</strong>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block' }}>Mã số sinh viên:</span>
                  <strong style={{ fontSize: 14, color: 'var(--primary)' }}>{statusData?.studentCode} 🔒</strong>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block' }}>Trường Đại học:</span>
                  <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{statusData?.schoolName} 🔒</strong>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block' }}>Hạn thẻ dự kiến:</span>
                  <strong style={{ fontSize: 14, color: 'var(--ink)' }}>31/12/{statusData?.graduationYear}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Trạng thái ĐANG CHỜ DUYỆT (Pending) */}
      {currentStatus === 'pending' && (
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Icon name="clock" style={{ width: 22, height: 22 }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#92400e' }}>
                Hồ Sơ Đang Chờ Quản Trị Viên Phê Duyệt
              </h4>
              <p style={{ margin: '0 0 10px', fontSize: 13.5, color: '#b45309', lineHeight: 1.5 }}>
                Hồ sơ xác minh thẻ sinh viên của bạn đã được gửi lên hệ thống vào lúc{' '}
                <b>{statusData?.submittedAt ? new Date(statusData.submittedAt).toLocaleString('vi-VN') : 'vừa xong'}</b>.
                Cam kết xử lý và phản hồi trong vòng <b>24 giờ làm việc</b>.
              </p>
              <div style={{ fontSize: 13, color: '#78350f', background: 'rgba(255,255,255,0.7)', padding: 12, borderRadius: 8 }}>
                💡 <b>Mẹo:</b> Trong thời gian chờ duyệt, bạn vẫn có thể nộp đơn ứng tuyển các công việc mong muốn. Đơn sẽ được lưu ở trạng thái chờ và tự động gửi tới Nhà tuyển dụng ngay khi thẻ của bạn được duyệt thành công!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Trạng thái CẦN BỔ SUNG THÔNG TIN (Need More Info) */}
      {currentStatus === 'need_more_info' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Icon name="alert-triangle" style={{ width: 22, height: 22 }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#b45309' }}>
                Quản Trị Viên Yêu Cầu Bổ Sung / Chụp Lại Thẻ
              </h4>
              <div style={{ background: '#fff', borderLeft: '4px solid #f59e0b', padding: '10px 14px', borderRadius: 4, margin: '8px 0 12px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', display: 'block' }}>Lý do từ Quản trị viên:</span>
                <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
                  {statusData?.userMessage || 'Ảnh chụp thẻ sinh viên chưa rõ ràng. Vui lòng chụp lại rõ nét cả 2 mặt thẻ.'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                Vui lòng cập nhật lại ảnh thẻ sinh viên rõ nét theo hướng dẫn bên dưới và bấm nút <b>"Cập nhật lại hồ sơ"</b>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Trạng thái BỊ TỪ CHỐI (Rejected) */}
      {currentStatus === 'rejected' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
              <Icon name="x" style={{ width: 22, height: 22 }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
                Hồ Sơ Xác Minh Thẻ Sinh Viên Bị Từ Chối
              </h4>
              <div style={{ background: '#fff', borderLeft: '4px solid #ef4444', padding: '10px 14px', borderRadius: 4, margin: '8px 0 12px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#991b1b', display: 'block' }}>Lý do từ chối:</span>
                <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
                  {statusData?.userMessage || statusData?.rejectionReason || 'Thông tin thẻ sinh viên không hợp lệ hoặc không xác thực được với nhà trường.'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                Bạn có thể kiểm tra lại thông tin chính xác và gửi lại yêu cầu xác minh mới bên dưới.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form Nộp / Cập nhật Xác minh (Hiển thị khi chưa duyệt hoặc bị từ chối / cần bổ sung) */}
      {currentStatus !== 'approved' && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>
            {currentStatus === 'need_more_info' ? 'Bổ Sung Thông Tin Thẻ Sinh Viên' : 'Thông Tin Đăng Ký Xác Minh'}
          </h4>

          {/* Thông tin tài khoản & đối soát */}
          <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                  📋 Thông tin tài khoản & đối soát thẻ
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Quản trị viên sẽ đối soát và phê duyệt theo ảnh chụp thẻ
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {/* Email tài khoản */}
              <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>
                  Email tài khoản:
                </span>
                <strong style={{ fontSize: 14, color: 'var(--primary)' }}>
                  {currentUser?.email || '—'}
                </strong>
              </div>

              {/* Tên tài khoản đăng ký */}
              <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>
                  Tên đăng ký tài khoản:
                </span>
                <strong style={{ fontSize: 14, color: 'var(--ink)' }}>
                  {currentUser?.fullName || 'Chưa cập nhật'}
                </strong>
              </div>

              {/* Mã số sinh viên */}
              <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>
                  Mã số sinh viên:
                </span>
                <span style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>
                  Chờ Admin duyệt theo thẻ
                </span>
              </div>

              {/* Trường & Năm tốt nghiệp */}
              <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>
                  Trường & Năm tốt nghiệp:
                </span>
                <span style={{ fontSize: 13, color: '#d97706', fontWeight: 600 }}>
                  Chờ Admin đối soát theo thẻ
                </span>
              </div>
            </div>
          </div>

          {/* Vùng tải ảnh thẻ sinh viên 2 mặt */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Ảnh chụp thẻ sinh viên <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Chỉ chấp nhận file ảnh (<b>JPG, PNG, WEBP</b>), tối đa 10MB/ảnh. Chụp rõ 4 góc thẻ, không lóa sáng, không che khuất thông tin.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Mặt trước */}
              <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 16, textAlign: 'center', background: 'var(--surface-sunken)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
                  1. Mặt trước thẻ sinh viên <span style={{ color: 'var(--danger)' }}>*</span>
                </span>

                {frontCard && (frontCard.previewUrl || frontCard.url) ? (
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ position: 'relative', background: '#0b0f19', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={frontCard.previewUrl || getMediaUrl(frontCard.url)}
                        alt="Mặt trước thẻ"
                        style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                        onError={(e) => {
                          if (frontCard.previewUrl && e.target.src !== frontCard.previewUrl) {
                            e.target.src = frontCard.previewUrl;
                          }
                        }}
                        onClick={() => setEnlargedImage(frontCard.previewUrl || getMediaUrl(frontCard.url))}
                      />
                      {uploadingFront && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          backdropFilter: 'blur(2px)'
                        }}>
                          <span className="adm-spinner" style={{ marginRight: 8 }} /> Đang tải lên máy chủ...
                        </div>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface-sunken)',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEnlargedImage(frontCard.previewUrl || getMediaUrl(frontCard.url))}
                        style={{ fontSize: 12, height: 30, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        🔍 Xem ảnh lớn
                      </button>
                      {currentStatus !== 'pending' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => frontInputRef.current?.click()}
                          disabled={uploadingFront}
                          style={{ fontSize: 12, height: 30 }}
                        >
                          Đổi ảnh khác
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px 12px' }}>
                    <Icon name="upload" style={{ width: 32, height: 32, color: 'var(--ink-soft)', marginBottom: 8 }} />
                    <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      Kéo thả hoặc bấm để chọn ảnh mặt trước
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => frontInputRef.current?.click()}
                      disabled={uploadingFront || currentStatus === 'pending'}
                    >
                      {uploadingFront ? 'Đang tải lên...' : 'Chọn ảnh mặt trước'}
                    </button>
                  </div>
                )}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleCardUpload(e, 'front')}
                />
              </div>

              {/* Mặt sau */}
              <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 16, textAlign: 'center', background: 'var(--surface-sunken)' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
                  2. Mặt sau thẻ sinh viên
                </span>

                {backCard && (backCard.previewUrl || backCard.url) ? (
                  <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ position: 'relative', background: '#0b0f19', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={backCard.previewUrl || getMediaUrl(backCard.url)}
                        alt="Mặt sau thẻ"
                        style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                        onError={(e) => {
                          if (backCard.previewUrl && e.target.src !== backCard.previewUrl) {
                            e.target.src = backCard.previewUrl;
                          }
                        }}
                        onClick={() => setEnlargedImage(backCard.previewUrl || getMediaUrl(backCard.url))}
                      />
                      {uploadingBack && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          backdropFilter: 'blur(2px)'
                        }}>
                          <span className="adm-spinner" style={{ marginRight: 8 }} /> Đang tải lên máy chủ...
                        </div>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface-sunken)',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEnlargedImage(backCard.previewUrl || getMediaUrl(backCard.url))}
                        style={{ fontSize: 12, height: 30, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        🔍 Xem ảnh lớn
                      </button>
                      {currentStatus !== 'pending' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => backInputRef.current?.click()}
                          disabled={uploadingBack}
                          style={{ fontSize: 12, height: 30 }}
                        >
                          Đổi ảnh khác
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px 12px' }}>
                    <Icon name="upload" style={{ width: 32, height: 32, color: 'var(--ink-soft)', marginBottom: 8 }} />
                    <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      Kéo thả hoặc bấm để chọn ảnh mặt sau
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => backInputRef.current?.click()}
                      disabled={uploadingBack || currentStatus === 'pending'}
                    >
                      {uploadingBack ? 'Đang tải lên...' : 'Chọn ảnh mặt sau'}
                    </button>
                  </div>
                )}
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => handleCardUpload(e, 'back')}
                />
              </div>
            </div>
          </div>

          {/* Cam kết & Quyền riêng tư */}
          <div style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            🔒 <b>Bảo vệ quyền riêng tư (Nghị định 13/2023/NĐ-CP)</b>
          </div>

          {currentStatus !== 'pending' && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || uploadingFront || uploadingBack}
              style={{ width: '100%', height: 44, fontSize: 14.5, fontWeight: 700 }}
            >
              {submitting
                ? 'Đang gửi hồ sơ...'
                : currentStatus === 'need_more_info'
                ? 'Gửi Lại Hồ Sơ Đã Bổ Sung'
                : 'Gửi Hồ Sơ Xác Minh Thẻ Sinh Viên'}
            </button>
          )}
        </form>
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
