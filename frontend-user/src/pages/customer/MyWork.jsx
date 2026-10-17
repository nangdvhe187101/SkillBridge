import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import Avatar from '../../components/Avatar';
import { useStore, fmtVND } from '../../context/StoreContext';
import { useModal } from '../../context/ModalContext';
import { useToast } from '../../context/ToastContext';
import { getJobDeliverables } from '../../api/deliverableApi';
import { getJobById, getDeadlineExtensionRequest, cancelDeadlineExtension } from '../../api/jobApi';
import { getJobReviews } from '../../api/reviewApi';
import { downloadJobAttachment, downloadDeliverableFile } from '../../utils/fileDownloader';
import { DeliverablePreview } from '../../components/modals/DeliverableModals';
import DisputeModal from '../../components/modals/DisputeModal';
import DisputeDetailModal from '../../components/modals/DisputeDetailModal';
import Icon from '../../components/Icon';

// ==========================================
// BỘ ICON TỰ THIẾT KẾ CHO SKILLBRIDGE MYWORK
// ==========================================
// =========================================================================
// BỘ ICON THIẾT KẾ ĐỘC QUYỀN CHO SKILLBRIDGE (100% HANDCRAFTED, ZERO STOCK)
// =========================================================================

// 1. Tab All Work: Ma trận phân tầng hồ sơ công việc đa dự án
function CustomIconAllWork({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Khung tài liệu dự án lớp dưới */}
      <rect x="7" y="3" width="14" height="14" rx="2.5" strokeOpacity="0.45" strokeDasharray="2 2" />
      {/* Thẻ quản lý trung tâm lớp trên */}
      <rect x="3" y="7" width="14" height="14" rx="2.5" fill="currentColor" fillOpacity="0.16" />
      {/* Vạch tiến độ và task checklist */}
      <path d="M6.5 11.5h7" />
      <path d="M6.5 15h4.5" />
      {/* Node liên kết SkillBridge đặc trưng */}
      <polygon points="18.5,12 21.5,14 18.5,16 15.5,14" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 2. Tab In Progress: Vòng xoay nhịp độ Sprint & kim định hướng tiến độ
function CustomIconInProgress({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Vòng cung gia tốc 270 độ */}
      <path d="M21 12A9 9 0 1 1 12 3" />
      {/* Mũi tên dẫn hướng tốc độ */}
      <path d="M12 3l3.5 2-3.5 2" />
      {/* Lõi năng lượng nhịp sprint 4 cánh */}
      <polygon points="12,8.5 13.5,11 16,12 13.5,13 12,15.5 10.5,13 8,12 10.5,11" fill="currentColor" fillOpacity="0.3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 3. Tab Submitted: Hộp ký quỹ Escrow bảo chứng bàn giao với luồng tải nghiệm thu
function CustomIconSubmitted({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Khối đế ký quỹ bảo vệ */}
      <path d="M4 14.5L5.5 20h13l1.5-5.5" fill="currentColor" fillOpacity="0.16" />
      {/* Khóa niêm phong Escrow bàn giao */}
      <path d="M9 14.5v1.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5v-1.5" />
      {/* Luồng chuyển giao hướng thượng nghiệm thu */}
      <path d="M12 3v8" strokeWidth="2.2" />
      <path d="M8.5 6.5L12 3l3.5 3.5" strokeWidth="2.2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

// 4. Tab Completed: Huy hiệu danh dự nghiệm thu tất toán thành công
function CustomIconCompleted({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Vòng nguyệt quế / đĩa danh dự */}
      <circle cx="12" cy="10" r="7" fill="currentColor" fillOpacity="0.18" />
      {/* Nét kiểm định nghiệm thu kép */}
      <path d="M9 10l2 2 4-4" strokeWidth="2.2" />
      {/* Dải ruy băng vinh danh kép */}
      <path d="M8.5 16L7 21.5l5-2 5 2-1.5-5.5" />
    </svg>
  );
}

// 5. Tab Overdue: Đồng hồ đo hạn định khẩn cấp (Precision Deadline Chronometer)
function CustomIconOverdue({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Nút bấm dừng giờ bấm giây */}
      <path d="M10 2h4" />
      <path d="M12 2v2" />
      <path d="M19 5l-1.5 1.5M5 5l1.5 1.5" />
      {/* Mặt số đo áp lực thời gian */}
      <circle cx="12" cy="13" r="8" fill="currentColor" fillOpacity="0.14" />
      {/* Kim chỉ phân vùng hạn định chạm ngưỡng đỏ */}
      <path d="M12 9v4l2.5 1.5" strokeWidth="2.2" />
      <circle cx="12" cy="7" r="0.9" fill="currentColor" />
    </svg>
  );
}

// 6. Tab Cancelled: Khiên an toàn Escrow & trọng tài phân giải hợp đồng
function CustomIconCancelled({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Khiên bảo vệ hợp đồng ký quỹ */}
      <path d="M12 2.5L4 6v6c0 5.5 3.5 9.5 8 10.5 4.5-1 8-5 8-10.5V6l-8-3.5z" fill="currentColor" fillOpacity="0.15" />
      {/* Trục trọng tài đối soát cân bằng */}
      <path d="M8 10.5h8" strokeWidth="2" />
      <path d="M12 7.5v6" strokeWidth="2" />
      {/* Đĩa cân bảo chứng quyền lợi hai bên */}
      <path d="M6 13.5h4M14 13.5h4" />
      <path d="M6 13.5l2-3M18 13.5l-2-3" />
    </svg>
  );
}

// 7. Tab Applications: Thẻ hồ sơ thông hành ứng viên sinh viên chính quy
function CustomIconApplications({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {/* Khuy móc dây thẻ sinh viên */}
      <path d="M9 2.5h6v2.5H9z" fill="currentColor" fillOpacity="0.35" />
      {/* Thẻ đeo ứng tuyển chính thức */}
      <rect x="4" y="5" width="16" height="16.5" rx="3" fill="currentColor" fillOpacity="0.14" />
      {/* Chân dung ứng viên đã xác thực */}
      <circle cx="12" cy="10.5" r="2.2" />
      <path d="M7.5 17a4.5 4.5 0 0 1 9 0" />
      {/* Tem chứng nhận nộp đơn */}
      <circle cx="16.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// 8. KPI Stat Card 1: Icon Đang thực hiện
function CustomStatIconInProgress() {
  return (
    <svg width={24} height={24} viewBox="0 0 28 28" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="14" cy="14" r="11" stroke="#93c5fd" strokeDasharray="3 3" />
      <path d="M14 3a11 11 0 0 1 11 11" stroke="#2563eb" strokeWidth="2.6" />
      <polygon points="14,7 16.5,12 21.5,12.5 17.5,16 18.5,21 14,18.5 9.5,21 10.5,16 6.5,12.5 11.5,12" fill="#bfdbfe" fillOpacity="0.55" />
      <circle cx="14" cy="14" r="2.2" fill="#2563eb" stroke="none" />
    </svg>
  );
}

// 9. KPI Stat Card 2: Icon Chờ nghiệm thu
function CustomStatIconSubmitted() {
  return (
    <svg width={24} height={24} viewBox="0 0 28 28" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 16l2 8h14l2-8" fill="#bbf7d0" fillOpacity="0.45" />
      <rect x="8" y="14" width="12" height="4" rx="1.5" fill="#86efac" />
      <path d="M14 3v9M9.5 7.5L14 3l4.5 4.5" strokeWidth="2.5" />
      <circle cx="14" cy="21" r="1.5" fill="#16a34a" stroke="none" />
    </svg>
  );
}

// 10. KPI Stat Card 3: Icon Yêu cầu sửa lại
function CustomStatIconRevision() {
  return (
    <svg width={24} height={24} viewBox="0 0 28 28" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a10 10 0 0 1 17-7" stroke="#fdba74" />
      <path d="M21 7V3m0 4h-4" stroke="#ea580c" />
      <path d="M24 14a10 10 0 0 1-17 7" stroke="#fdba74" />
      <path d="M7 21v4m0-4h4" stroke="#ea580c" />
      <path d="M11 17l6-6 2 2-6 6-3 1 1-3z" fill="#fed7aa" fillOpacity="0.6" strokeWidth="1.8" />
    </svg>
  );
}

// 11. KPI Stat Card 4: Icon Đơn ứng tuyển
function CustomStatIconApplications() {
  return (
    <svg width={24} height={24} viewBox="0 0 28 28" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="18" height="20" rx="3.5" fill="#e9d5ff" fillOpacity="0.45" />
      <circle cx="14" cy="11" r="3.2" stroke="#9333ea" />
      <path d="M8.5 19a5.5 5.5 0 0 1 11 0" stroke="#9333ea" />
      <path d="M19 7l2-2" strokeWidth="2.5" stroke="#a855f7" />
      <path d="M19 7h-2" stroke="#a855f7" />
    </svg>
  );
}

// 12. Minh họa trạng thái rỗng đặc thù từng tab (thay thế hoàn toàn emoji)
function CustomEmptyStateIllustration({ type }) {
  if (type === 'overdue') {
    return (
      <svg width={56} height={56} viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
        <circle cx="32" cy="32" r="30" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="2" />
        <path d="M32 14L18 20v14c0 9.5 6 17 14 19 8-2 14-9.5 14-19V20L32 14z" fill="#d1fae5" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M25 32.5l5 5 10-11" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="18" r="2.2" fill="#10b981" />
        <circle cx="48" cy="18" r="2.2" fill="#10b981" />
      </svg>
    );
  }
  if (type === 'cancelled') {
    return (
      <svg width={56} height={56} viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
        <circle cx="32" cy="32" r="30" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
        <path d="M32 15L20 21v12c0 8.5 5.2 15.5 12 17.5 6.8-2 12-9 12-17.5V21L32 15z" fill="#ede9fe" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M26 29h12" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M32 25v13" stroke="#4f46e5" strokeWidth="2.5" />
        <path d="M24 35h4l-2-6zM36 35h4l-2-6z" fill="#c7d2fe" stroke="#4f46e5" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === 'completed') {
    return (
      <svg width={56} height={56} viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
        <circle cx="32" cy="32" r="30" fill="#fefce8" stroke="#fef08a" strokeWidth="2" />
        <circle cx="32" cy="28" r="13" fill="#fef08a" stroke="#ca8a04" strokeWidth="2.5" />
        <polygon points="32,19 35,25 41,26 36.5,30.5 38,37 32,33.5 26,37 27.5,30.5 23,26 29,25" fill="#eab308" />
        <path d="M26 39l-4 12 10-4 10 4-4-12" fill="#fde047" stroke="#ca8a04" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'submitted') {
    return (
      <svg width={56} height={56} viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
        <circle cx="32" cy="32" r="30" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
        <path d="M18 36l14 8 14-8-14-8-14 8z" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
        <path d="M18 36v10l14 8 14-8V36" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
        <path d="M32 44v10" stroke="#2563eb" strokeWidth="2" />
        <path d="M32 14v16m0-16l-5 5m5-5l5 5" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Default / In progress / All
  return (
    <svg width={56} height={56} viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 14px', display: 'block' }}>
      <circle cx="32" cy="32" r="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="20" y="22" width="24" height="22" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="2.5" />
      <path d="M27 22V17a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v5" stroke="#64748b" strokeWidth="2.5" />
      <path d="M26 32h12M26 37h8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '';
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function getDeliverableFileMeta(fileName, fileType) {
  const ext = (fileType || fileName || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz':
      return { icon: 'archive', label: 'Tệp nén lưu trữ (Archive)', color: '#d97706', bg: '#fef3c7' };
    case 'doc': case 'docx':
      return { icon: 'file-text', label: 'Tài liệu Word', color: '#2563eb', bg: '#eff6ff' };
    case 'xls': case 'xlsx': case 'csv':
      return { icon: 'chart-bar', label: 'Bảng tính Excel', color: '#16a34a', bg: '#f0fdf4' };
    case 'pdf':
      return { icon: 'file-text', label: 'Tài liệu PDF', color: '#dc2626', bg: '#fef2f2' };
    case 'ppt': case 'pptx':
      return { icon: 'chart-bar', label: 'Bài trình chiếu PowerPoint', color: '#ea580c', bg: '#fff7ed' };
    case 'png': case 'jpg': case 'jpeg': case 'webp': case 'gif': case 'svg': case 'image':
      return { icon: 'image', label: 'Hình ảnh thiết kế', color: '#7c3aed', bg: '#f5f3ff' };
    case 'mp4': case 'mov': case 'm4v': case 'webm': case 'avi': case 'mkv': case 'video':
      return { icon: 'video', label: 'Video sản phẩm', color: '#0284c7', bg: '#e0f2fe' };
    case 'mp3': case 'wav': case 'm4a': case 'aac': case 'flac':
      return { icon: 'video', label: 'Tệp âm thanh', color: '#db2777', bg: '#fdf2f8' };
    case 'url':
      return { icon: 'link', label: 'Liên kết ngoài', color: '#4f46e5', bg: '#eef2ff' };
    default:
      return { icon: 'folder', label: 'Tệp sản phẩm', color: '#475569', bg: '#f1f5f9' };
  }
}

function formatDeliverableDisplayName(fileName, jobId, version = 1, isExternal = false) {
  if (isExternal || !fileName) return fileName || 'Liên kết sản phẩm';
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  const cleanName = fileName.replace(/\.[^/.]+$/, '');
  return `${cleanName}_v${version}${ext ? '.' + ext : ''}`;
}

function formatDeadline(ts) {
  if (!ts) return '—';
  let iso = typeof ts === 'string' ? ts.trim().replace(' ', 'T') : ts;
  if (typeof iso === 'string' && !iso.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso += 'Z';
  }
  const time = typeof iso === 'string' || iso instanceof Date ? new Date(iso).getTime() : iso;
  if (isNaN(time)) return '—';
  const diff = time - Date.now();
  if (diff <= 0) return 'Đã quá hạn';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `còn ${days} ngày ${hours} giờ`;
  return `còn ${hours} giờ`;
}

function getBonusCountdown(completedAt, nowMs = Date.now()) {
  if (!completedAt) return null;
  let iso = typeof completedAt === 'string' ? completedAt.trim().replace(' ', 'T') : completedAt;
  if (typeof iso === 'string' && !iso.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso += 'Z';
  }
  const completedTime = typeof iso === 'string' || iso instanceof Date ? new Date(iso).getTime() : iso;
  if (isNaN(completedTime)) return null;

  const threeDaysMs = 72 * 3600 * 1000;
  const deadlineMs = completedTime + threeDaysMs;
  const diffMs = deadlineMs - nowMs;

  if (diffMs <= 0) {
    return {
      isWithin3Days: false,
      text: 'Đã hết hạn',
      diffMs: 0,
      remainingHours: 0
    };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  let text;
  if (days > 0) {
    text = `còn ${days} ngày ${hours} giờ ${minutes} phút`;
  } else if (hours > 0) {
    text = `còn ${hours} giờ ${minutes} phút ${seconds} giây`;
  } else {
    text = `còn ${minutes} phút ${seconds} giây`;
  }

  return {
    isWithin3Days: true,
    text,
    diffMs,
    remainingHours: diffMs / 3600000,
    days,
    hours,
    minutes,
    seconds
  };
}

function getDeadlineUrgency(ts) {
  if (!ts) return 'normal';
  let iso = typeof ts === 'string' ? ts.trim().replace(' ', 'T') : ts;
  if (typeof iso === 'string' && !iso.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
    iso += 'Z';
  }
  const time = typeof iso === 'string' || iso instanceof Date ? new Date(iso).getTime() : iso;
  if (isNaN(time)) return 'normal';
  const diff = time - Date.now();
  if (diff <= 0) return 'overdue';
  if (diff < 24 * 3600000) return 'urgent';
  return 'normal';
}

// Map trạng thái ứng tuyển hiển thị cho SV
const APP_STATUS_LABEL = {
  pending: 'Đang chờ duyệt',
  hired: 'Đã được chọn',
  rejected: 'Chưa phù hợp',
  submitted: 'Đã nộp bàn giao',
  revision_requested: 'Cần sửa đổi',
  disputed: 'Đang khiếu nại',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

function getApplicationStatusMeta(status, jobStatus) {
  const isOtherHired = status === 'pending' && ['in_progress', 'submitted', 'completed', 'filled'].includes(jobStatus);
  if (isOtherHired) {
    return {
      label: 'Chưa phù hợp (Đã chọn người khác)',
      bg: '#f1f5f9',
      color: '#64748b',
      border: '#cbd5e1',
      icon: 'users',
    };
  }
  switch (status) {
    case 'hired':
      return {
        label: 'Đã được chọn',
        bg: '#dcfce7',
        color: '#15803d',
        border: '#86efac',
        icon: 'check',
      };
    case 'submitted':
      return {
        label: 'Đã nộp bàn giao',
        bg: '#e0e7ff',
        color: '#4338ca',
        border: '#c7d2fe',
        icon: 'file-text',
      };
    case 'revision_requested':
      return {
        label: 'Cần sửa đổi',
        bg: '#ffedd5',
        color: '#c2410c',
        border: '#fed7aa',
        icon: 'edit',
      };
    case 'completed':
      return {
        label: 'Hoàn thành',
        bg: '#f0fdf4',
        color: '#166534',
        border: '#bbf7d0',
        icon: 'gem',
      };
    case 'pending':
      return {
        label: 'Đang chờ duyệt',
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fde68a',
        icon: 'clock',
      };
    case 'rejected':
      return {
        label: 'Chưa phù hợp',
        bg: '#f8fafc',
        color: '#64748b',
        border: '#e2e8f0',
        icon: 'ban',
      };
    case 'cancelled':
      return {
        label: 'Đã hủy',
        bg: '#fef2f2',
        color: '#b91c1c',
        border: '#fecaca',
        icon: 'x',
      };
    case 'disputed':
      return {
        label: 'Đang khiếu nại',
        bg: '#fee2e2',
        color: '#991b1b',
        border: '#f87171',
        icon: 'scale',
      };
    default:
      return {
        label: APP_STATUS_LABEL[status] || status,
        bg: '#f1f5f9',
        color: '#475569',
        border: '#e2e8f0',
        icon: 'sparkles',
      };
  }
}



export default function MyWork() {
  const {
    state,
    openChatWithPerson,
    refreshMyApplications,
    cancelStudentWorkAsync,
    withdrawApplicationAsync,
    refreshDisputes
  } = useStore();
  const { openModal } = useModal();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'in_progress' | 'submitted' | 'completed' | 'overdue' | 'cancelled' | 'applications'
  const [appFilter, setAppFilter] = useState('all'); // 'all' | 'pending' | 'hired' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [appsPage, setAppsPage] = useState(1);
  const [workPage, setWorkPage] = useState(1);
  const [workPageSize, setWorkPageSize] = useState(1); // Mỗi job là 1 trang theo yêu cầu trải nghiệm gọn gàng
  const [deliverablesMap, setDeliverablesMap] = useState({});
  const [jobDetailsMap, setJobDetailsMap] = useState({});
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState({});
  const [cancelModalJob, setCancelModalJob] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [disputeModalJob, setDisputeModalJob] = useState(null);
  const [disputeDetailModalId, setDisputeDetailModalId] = useState(null);
  const [extensionRefreshTrigger, setExtensionRefreshTrigger] = useState(0);
  const [extensionsMap, setExtensionsMap] = useState({});
  const [jobReviewsMap, setJobReviewsMap] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const appsPageSize = 6;

  // Real-time live countdown ticker cập nhật mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset trang về 1 khi chuyển tab
  useEffect(() => {
    setWorkPage(1);
  }, [activeTab]);

  // Làm mới danh sách ứng tuyển & khiếu nại khi vào trang
  useEffect(() => {
    if (typeof refreshMyApplications === 'function') {
      refreshMyApplications();
    }
    if (typeof refreshDisputes === 'function') {
      refreshDisputes();
    }
  }, [refreshMyApplications, refreshDisputes]);

  const loadJobReview = useCallback(async (jobId) => {
    if (!jobId) return;
    try {
      const res = await getJobReviews(jobId);
      if (res) {
        setJobReviewsMap(prev => ({ ...prev, [jobId]: res }));
      }
    } catch {}
  }, []);

  // Tải trạng thái yêu cầu gia hạn deadline đang chờ cho các công việc sinh viên ĐANG LÀM
  const activeCandidateJobs = useMemo(() => {
    return (state?.myApplications || [])
      .filter(a => ['hired', 'submitted', 'revision_requested', 'disputed'].includes(a.status))
      .map(a => a.jobId || a.job?.id)
      .filter(Boolean);
  }, [state?.myApplications]);

  const activeCandidateJobsKey = activeCandidateJobs.slice().sort().join(',');

  useEffect(() => {
    let isMounted = true;
    if (activeCandidateJobs.length === 0) {
      setExtensionsMap({});
      return;
    }

    Promise.all(
      activeCandidateJobs.map(async (jid) => {
        try {
          const ext = await getDeadlineExtensionRequest(jid);
          return { jid, ext };
        } catch {
          return { jid, ext: null };
        }
      })
    ).then((results) => {
      if (isMounted) {
        const map = {};
        results.forEach(r => {
          if (r.ext) map[r.jid] = r.ext;
        });
        setExtensionsMap(map);
      }
    });

    return () => { isMounted = false; };
  }, [activeCandidateJobsKey, extensionRefreshTrigger]);

  // Tải trạng thái đánh giá cho các công việc đã hoàn thành của sinh viên
  const completedJobIdsKey = useMemo(() => {
    return (state?.myApplications || [])
      .filter(a => a.status === 'completed' || a.jobStatus === 'completed')
      .map(a => a.jobId || a.job?.id)
      .filter(Boolean)
      .sort()
      .join(',');
  }, [state?.myApplications]);

  useEffect(() => {
    if (!completedJobIdsKey) return;
    const completedJobIds = completedJobIdsKey.split(',').filter(Boolean);
    completedJobIds.forEach(jid => {
      loadJobReview(jid);
    });
  }, [completedJobIdsKey, loadJobReview]);

  const handleCancelExtension = async (targetJobId, extId) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi đề xuất gia hạn deadline này không?')) return;
    try {
      await cancelDeadlineExtension(targetJobId, extId);
      showToast?.('Đã thu hồi đề xuất gia hạn thành công.', 'check');
      setExtensionRefreshTrigger(t => t + 1);
    } catch (err) {
      showToast?.(err.message || 'Không thể thu hồi yêu cầu gia hạn.', 'x');
    }
  };

  // Lọc các ứng tuyển đang trong giai đoạn làm việc thực tế
  const activeApps = useMemo(() => {
    return (state.myApplications || []).filter((a) => {
      const targetJobId = a.jobId || a.id;
      const hasDispute = (state.disputes || []).some(
        (d) => Number(d.jobId) === Number(targetJobId) && ['pending', 'in_arbitration'].includes(d.status)
      );

      // QUAN TRỌNG: Chỉ khi chính sinh viên này trúng tuyển ('hired', 'submitted', 'revision_requested', 'disputed', 'completed')
      // thì mới được đưa vào danh sách việc đang làm / đã hoàn thành!
      // TUYỆT ĐỐI không dựa vào a.jobStatus, vì jobStatus là trạng thái công việc chung của NTD
      // (khi NTD tuyển ứng viên khác, jobStatus đổi sang in_progress/submitted nhưng sinh viên này KHÔNG trúng tuyển).
      const isHiredForThisJob = ['hired', 'submitted', 'revision_requested', 'disputed', 'completed'].includes(a.status);

      return isHiredForThisJob || (hasDispute && a.status !== 'pending' && a.status !== 'rejected' && a.status !== 'cancelled');
    });
  }, [state.myApplications, state.disputes]);

  const activeAppIdsKey = useMemo(() => {
    return activeApps.map(a => a.jobId || a.id).filter(Boolean).sort().join(',');
  }, [activeApps]);

  // Bộ nhớ đệm ID các job đã tải deliverables để tránh spam API 429
  const loadedDeliverableJobIdsRef = useRef(new Set());

  // Nạp danh sách deliverables và chi tiết job thật cho các việc đang làm
  const loadDeliverables = useCallback(async (forceReload = false) => {
    if (!activeApps.length) return;

    const jobsToFetch = activeApps.filter(a => {
      const jId = a.jobId || a.id;
      if (!jId || isNaN(Number(jId))) return false;
      return forceReload || !loadedDeliverableJobIdsRef.current.has(Number(jId));
    });

    if (jobsToFetch.length === 0) return;

    setLoadingDeliverables(true);
    const results = {};
    const jobResults = {};
    await Promise.allSettled(
      jobsToFetch.map(async (a) => {
        const jId = a.jobId || a.id;
        const numJobId = Number(jId);
        try {
          const [delivRes, jobRes] = await Promise.allSettled([
            getJobDeliverables(numJobId),
            getJobById(numJobId)
          ]);

          if (delivRes.status === 'fulfilled') {
            const res = delivRes.value;
            const delivs = Array.isArray(res) ? res : (res?.items || []);
            const latest = delivs[0] || null;
            const allFeedbacks = [];
            delivs.forEach((d) => {
              (d.feedbacks || []).forEach((f) => {
                allFeedbacks.push({
                  version: d.version,
                  text: f.content || f.feedbackText || '',
                  at: f.createdAt ? new Date(f.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
                  author: f.authorName || 'Nhà tuyển dụng',
                });
              });
            });
            results[jId] = {
              deliverable: latest,
              deliverableFeedback: allFeedbacks,
              allDeliverables: delivs,
            };
            loadedDeliverableJobIdsRef.current.add(numJobId);
          }

          if (jobRes.status === 'fulfilled' && jobRes.value) {
            jobResults[jId] = jobRes.value;
          }
        } catch {
          // ignore error if fetch fails
        }
      })
    );
    setDeliverablesMap(prev => ({ ...prev, ...results }));
    setJobDetailsMap(prev => ({ ...prev, ...jobResults }));
    setLoadingDeliverables(false);
  }, [activeApps]);

  useEffect(() => {
    loadDeliverables();
  }, [activeAppIdsKey, loadDeliverables]);

  const activeWork = useMemo(() => {
    // Lấy danh sách việc đang làm từ myApplications
    const appsWork = activeApps.map((a) => {
      const targetJobId = a.jobId || a.id;
      const jobInfo = jobDetailsMap[targetJobId];
      const matchingJob = (state.jobs || []).find((j) => j.id === targetJobId || (a.dashJobId && j.dashJobId === a.dashJobId)) || jobInfo;
      const delivData = deliverablesMap[targetJobId] || {};

      const relatedDispute = (state.disputes || []).find(
        (d) => Number(d.jobId) === Number(targetJobId)
      );

      let effectiveStatus = a.jobStatus || jobInfo?.status;
      if (relatedDispute && ['pending', 'in_arbitration'].includes(relatedDispute.status)) {
        effectiveStatus = 'disputed';
      } else if (a.status === 'completed' || effectiveStatus === 'completed') {
        effectiveStatus = 'completed';
      } else if (!effectiveStatus || effectiveStatus === 'open' || effectiveStatus === 'filled') {
        effectiveStatus = a.status === 'hired' ? 'in_progress' : a.status;
      }

      const employerAvatar = jobInfo?.employerAvatar || jobInfo?.employerAvatarUrl || jobInfo?.employer?.avatarUrl || a.employerAvatarUrl || a.employerAvatar || a.empAvatar || matchingJob?.employerAvatar || matchingJob?.empAvatar || matchingJob?.employerAvatarUrl || matchingJob?.employer?.avatarUrl || null;

      const rawReq = jobInfo?.requirements || matchingJob?.req || matchingJob?.requirements || [];
      const reqList = Array.isArray(rawReq)
        ? rawReq.map((r) => (typeof r === 'string' ? r : r.requirementText || r.text || ''))
        : [];
      const attachmentsList = Array.isArray(jobInfo?.attachments)
        ? jobInfo.attachments
        : (Array.isArray(matchingJob?.attachments) ? matchingJob.attachments : []);

      return {
        id: targetJobId,
        jobId: targetJobId,
        disputeId: relatedDispute?.id || a.disputeId || null,
        disputeInfo: relatedDispute || null,
        title: a.jobTitle || a.title || jobInfo?.title || matchingJob?.title || 'Công việc',
        desc: jobInfo?.description || matchingJob?.desc || matchingJob?.description || '',
        req: reqList,
        attachments: attachmentsList,
        cat: jobInfo?.categoryName || matchingJob?.cat || 'Dự án Freelance',
        budget: a.budget || jobInfo?.budget || matchingJob?.budget || 0,
        status: effectiveStatus,
        deadlineAt: a.deadlineAt || jobInfo?.deadlineAt || matchingJob?.deadlineAt || null,
        revisionCount: a.revisionCount !== undefined && a.revisionCount !== null ? a.revisionCount : (matchingJob?.revisionCount || 0),
        revisionLimit: a.revisionLimit !== undefined && a.revisionLimit !== null ? a.revisionLimit : (matchingJob?.revisionLimit || 2),
        deliverable: delivData.deliverable || matchingJob?.deliverable || null,
        deliverableFeedback: (delivData.deliverableFeedback?.length > 0)
          ? delivData.deliverableFeedback
          : (matchingJob?.deliverableFeedback || []),
        allDeliverables: delivData.allDeliverables || (delivData.deliverable ? [delivData.deliverable] : (matchingJob?.deliverable ? [matchingJob.deliverable] : [])),
        emp: a.employerName || a.emp || jobInfo?.employerName || matchingJob?.emp || 'Nhà tuyển dụng',
        empAvatar: employerAvatar,
        employerAvatar: employerAvatar,
        employerAvatarUrl: employerAvatar,
        completedAt: a.completedAt || jobInfo?.completedAt || (effectiveStatus === 'completed' ? (delivData.deliverable?.updatedAt || delivData.deliverable?.submittedAt || delivData.deliverable?.createdAt || a.updatedAt || jobInfo?.updatedAt) : null),
      };
    });

    appsWork.sort((x, y) => {
      if (x.status === 'completed' && y.status !== 'completed') return 1;
      if (x.status !== 'completed' && y.status === 'completed') return -1;
      return Number(y.id || 0) - Number(x.id || 0);
    });

    // Nếu người dùng đã đăng nhập, luôn sử dụng dữ liệu thực tế (kể cả khi rỗng, không rò rỉ mock)
    if (state.currentUser) {
      return appsWork;
    }

    if (appsWork.length > 0) return appsWork;

    // Fallback cho dữ liệu mock state.myJobs (chỉ khi chưa đăng nhập / demo)
    return (state.myJobs || []).filter((j) =>
      ['in_progress', 'submitted', 'revision_requested'].includes(j.status) && j.hiredApplicant
    ).map((j) => ({
      ...j,
      jobId: j.id,
      cat: j.cat || 'Dự án Freelance',
      emp: state.jobs.find((pj) => pj.dashJobId === j.id)?.emp || 'Nhà tuyển dụng',
      empAvatar: j.employerAvatar || j.empAvatar || null
    }));
  }, [activeApps, deliverablesMap, state.jobs, state.myJobs, state.currentUser]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const inProgressCount = activeWork.filter(w => ['in_progress', 'hired'].includes(w.status)).length;
    const submittedCount = activeWork.filter(w => w.status === 'submitted').length;
    const revisionCount = activeWork.filter(w => w.status === 'revision_requested').length;
    const totalBudget = activeWork.reduce((acc, curr) => acc + (curr.budget || 0), 0);
    const totalApps = (state.myApplications || []).length;
    return { inProgressCount, submittedCount, revisionCount, totalBudget, totalApps };
  }, [activeWork, state.myApplications]);

  const getJobCategory = useCallback((j) => {
    const isCompleted = j.status === 'completed';
    const isDisputed = j.status === 'disputed' || Boolean(j.disputeInfo);
    const isCancelled = j.status === 'cancelled';
    if (isCompleted) return 'completed';
    if (isDisputed || isCancelled) return 'cancelled';

    const urgency = getDeadlineUrgency(j.deadlineAt);
    const isOverdue = urgency === 'overdue' || (j.deadlineAt && (new Date(j.deadlineAt).getTime() <= Date.now()));
    if (isOverdue) return 'overdue';

    if (j.status === 'submitted' || j.status === 'revision_requested') {
      return 'submitted';
    }

    return 'in_progress';
  }, []);

  const workFilterCounts = useMemo(() => {
    let inProgress = 0;
    let submitted = 0;
    let completed = 0;
    let overdue = 0;
    let cancelled = 0;

    activeWork.forEach((j) => {
      const cat = getJobCategory(j);
      if (cat === 'in_progress') inProgress++;
      else if (cat === 'submitted') submitted++;
      else if (cat === 'completed') completed++;
      else if (cat === 'overdue') overdue++;
      else if (cat === 'cancelled') cancelled++;
    });

    return {
      all: activeWork.length,
      in_progress: inProgress,
      submitted,
      completed,
      overdue,
      cancelled,
      applications: (state.myApplications || []).length
    };
  }, [activeWork, state.myApplications, getJobCategory]);

  const displayedWork = useMemo(() => {
    if (activeTab === 'applications') return [];
    if (activeTab === 'all' || activeTab === 'active') return activeWork;
    return activeWork.filter((j) => getJobCategory(j) === activeTab);
  }, [activeWork, activeTab, getJobCategory]);

  const workTotalPages = Math.ceil(displayedWork.length / workPageSize) || 1;
  const pagedWork = useMemo(() => {
    const start = (workPage - 1) * workPageSize;
    return displayedWork.slice(start, start + workPageSize);
  }, [displayedWork, workPage, workPageSize]);

  // Bộ lọc danh sách ứng tuyển
  const filteredApplications = useMemo(() => {
    let list = (state.myApplications || []);
    if (appFilter === 'pending') {
      list = list.filter(a => a.status === 'pending');
    } else if (appFilter === 'hired') {
      list = list.filter(a => ['hired', 'submitted', 'revision_requested', 'completed'].includes(a.status));
    } else if (appFilter === 'rejected') {
      list = list.filter(a => a.status === 'rejected');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        (a.title || a.jobTitle || '').toLowerCase().includes(q) ||
        (a.emp || a.employerName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.myApplications, appFilter, searchQuery]);

  const appsTotalPages = Math.ceil(filteredApplications.length / appsPageSize) || 1;
  const pagedApplications = useMemo(() => {
    const start = (appsPage - 1) * appsPageSize;
    return filteredApplications.slice(start, start + appsPageSize);
  }, [filteredApplications, appsPage]);

  const handleOpenDeliverableModal = (targetJobId, j) => {
    openModal('deliverable', {
      jobId: targetJobId,
      job: j,
      onSubmitted: () => {
        loadDeliverables();
        if (typeof refreshMyApplications === 'function') {
          refreshMyApplications();
        }
      }
    });
  };

  const handleConfirmCancelJob = async () => {
    if (!cancelModalJob) return;
    setIsCancelling(true);
    try {
      const jId = cancelModalJob.jobId || cancelModalJob.id;
      await cancelStudentWorkAsync(jId, cancelReason);
      setCancelModalJob(null);
      setCancelReason('');
      if (typeof refreshMyApplications === 'function') {
        await refreshMyApplications();
      }
      await loadDeliverables();
    } catch {
      // error toast handled in store action
    } finally {
      setIsCancelling(false);
    }
  };

  const handleWithdrawApp = async (targetJobId) => {
    if (window.confirm('Bạn có chắc chắn muốn rút đơn ứng tuyển này không?')) {
      await withdrawApplicationAsync(targetJobId);
    }
  };

  return (
    <div className="page active" style={{ background: 'var(--bg, #f8fafc)', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        color: '#fff',
        padding: '44px 0 36px',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: '#a5b4fc',
              marginBottom: 10
            }}>
              Không gian làm việc
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#ffffff', letterSpacing: '-0.5px' }}>
              Quản lý công việc & Bàn giao
            </h1>
            <p style={{ margin: 0, fontSize: 14.5, color: '#c7d2fe', maxWidth: 620, lineHeight: 1.5 }}>
              Theo dõi tiến độ việc đang làm, nộp sản phẩm đúng hạn và xem kết quả ứng tuyển.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/jobs')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="search" width={14} height={14} /> Tìm việc mới
            </button>
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 80 }}>
        {/* KPI Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CustomStatIconInProgress />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Đang thực hiện</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {stats.inProgressCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>công việc</span>
              </div>
              {stats.totalBudget > 0 && (
                <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                  Tổng thù lao: {fmtVND(stats.totalBudget)}
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CustomStatIconSubmitted />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Chờ nghiệm thu</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {stats.submittedCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>sản phẩm</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>NTD đang xem xét</div>
            </div>
          </div>

          <div style={{
            background: stats.revisionCount > 0 ? '#fff1f2' : '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: stats.revisionCount > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: stats.revisionCount > 0 ? '#ffe4e6' : '#fff7ed',
              color: stats.revisionCount > 0 ? '#e11d48' : '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CustomStatIconRevision />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: stats.revisionCount > 0 ? '#be123c' : '#64748b', fontWeight: 600 }}>Yêu cầu sửa lại</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: stats.revisionCount > 0 ? '#be123c' : '#0f172a' }}>
                {stats.revisionCount} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>cần sửa</span>
              </div>
              <div style={{ fontSize: 11.5, color: stats.revisionCount > 0 ? '#e11d48' : '#64748b', marginTop: 2 }}>
                {stats.revisionCount > 0 ? 'Cần cập nhật sớm' : 'Không có yêu cầu'}
              </div>
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#faf5ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CustomStatIconApplications />
            </div>
            <div>
              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Đơn ứng tuyển</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {stats.totalApps} <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>hồ sơ</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>Tổng số đã nộp</div>
            </div>
          </div>
        </div>

        {/* Scoped Responsive Styles for Segmented Navigation (No horizontal scrolling on any screen) */}
        <style>{`
          .mywork-nav-segmented-wrap {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 24px;
            width: 100%;
          }
          .mywork-nav-row {
            display: flex;
            gap: 6px;
            width: 100%;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 4px;
            box-sizing: border-box;
          }
          @media (min-width: 992px) {
            .mywork-nav-segmented-wrap {
              flex-direction: row;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              padding: 5px;
              gap: 5px;
            }
            .mywork-nav-row {
              background: transparent;
              border: none;
              padding: 0;
              gap: 5px;
            }
            .mywork-nav-row-1 {
              flex: 4;
            }
            .mywork-nav-row-2 {
              flex: 3;
            }
          }
          .mywork-tab-btn {
            flex: 1 1 0;
            min-width: 0;
            display: inline-flex;
            align-items: center;
            justifyContent: center;
            gap: 6px;
            padding: 9px 8px;
            border-radius: 9px;
            border: 1px solid transparent;
            background: transparent;
            cursor: pointer;
            color: #64748b;
            font-size: 13.5px;
            font-weight: 600;
            transition: all 0.16s ease;
            user-select: none;
            white-space: nowrap;
          }
          .mywork-tab-btn:hover {
            color: #1e293b;
            background: rgba(255, 255, 255, 0.7);
          }
          .mywork-tab-btn.active {
            background: #ffffff;
            color: #4338ca;
            font-weight: 700;
            border-color: rgba(226, 232, 240, 0.9);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
          }
          .mywork-tab-btn.active.is-danger {
            color: #dc2626;
            border-color: #fecdd3;
          }
          .mywork-tab-btn.active.is-highlight {
            color: #a16207;
            border-color: #fef08a;
          }
          .mywork-tab-badge {
            display: inline-flex;
            align-items: center;
            justifyContent: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            border-radius: 9px;
            font-size: 11px;
            font-weight: 800;
            line-height: 1;
            background: #e2e8f0;
            color: #475569;
            transition: all 0.15s ease;
            flex-shrink: 0;
          }
          .mywork-tab-btn.active .mywork-tab-badge {
            background: #4338ca;
            color: #ffffff;
          }
          .mywork-tab-btn.active.is-danger .mywork-tab-badge {
            background: #dc2626;
            color: #ffffff;
          }
          .mywork-tab-btn.active.is-highlight .mywork-tab-badge {
            background: #ca8a04;
            color: #ffffff;
          }
          .mywork-tab-btn.has-danger-count .mywork-tab-badge {
            background: #fee2e2;
            color: #dc2626;
          }
          .mywork-tab-btn.has-highlight-count .mywork-tab-badge {
            background: #fef9c3;
            color: #a16207;
            border: 1px solid #fef08a;
          }
          .mywork-tab-label {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          @media (max-width: 640px) {
            .mywork-tab-btn {
              padding: 8px 3px;
              gap: 4px;
              font-size: 11.5px;
            }
            .mywork-tab-badge {
              min-width: 16px;
              height: 16px;
              font-size: 10px;
              padding: 0 3px;
            }
          }
        `}</style>

        {/* Tab Navigation Controls (Responsive Segmented Layout - No Scroll) */}
        <div className="mywork-nav-segmented-wrap">
          {/* Row 1: Pipeline tiến độ công việc (4 nút chiếm đều 100% trên mobile) */}
          <div className="mywork-nav-row mywork-nav-row-1">
            {[
              { id: 'all', label: 'Tất cả', fullLabel: 'Tất cả công việc', IconComp: CustomIconAllWork, count: workFilterCounts.all },
              { id: 'in_progress', label: 'Đang làm', fullLabel: 'Đang làm (Chưa bàn giao)', IconComp: CustomIconInProgress, count: workFilterCounts.in_progress },
              { id: 'submitted', label: 'Đã nộp', fullLabel: 'Đã bàn giao (Chờ duyệt)', IconComp: CustomIconSubmitted, count: workFilterCounts.submitted },
              { id: 'completed', label: 'Hoàn thành', fullLabel: 'Đã hoàn thành (Cần đánh giá)', IconComp: CustomIconCompleted, count: workFilterCounts.completed, highlight: true },
            ].map((tab) => {
              const isActive = activeTab === tab.id || (tab.id === 'all' && activeTab === 'active');
              const hasHighlight = tab.highlight && tab.count > 0;
              const IconComponent = tab.IconComp;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`mywork-tab-btn ${isActive ? 'active' : ''} ${hasHighlight ? 'has-highlight-count' : ''} ${isActive && hasHighlight ? 'is-highlight' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.fullLabel}
                >
                  <IconComponent size={16} />
                  <span className="mywork-tab-label">{tab.label}</span>
                  <span className="mywork-tab-badge">{tab.count}</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Ngoại lệ & Hồ sơ ứng tuyển (3 nút chiếm đều 100% trên mobile) */}
          <div className="mywork-nav-row mywork-nav-row-2">
            {[
              { id: 'overdue', label: 'Quá hạn', fullLabel: 'Quá hạn bàn giao', IconComp: CustomIconOverdue, count: workFilterCounts.overdue, isDanger: workFilterCounts.overdue > 0 },
              { id: 'cancelled', label: 'Bị hủy', fullLabel: 'Bị hủy / Tranh chấp', IconComp: CustomIconCancelled, count: workFilterCounts.cancelled },
              { id: 'applications', label: 'Đơn ứng tuyển', fullLabel: 'Đơn ứng tuyển của bạn', IconComp: CustomIconApplications, count: workFilterCounts.applications },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const isDanger = tab.isDanger && tab.count > 0;
              const IconComponent = tab.IconComp;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`mywork-tab-btn ${isActive ? 'active' : ''} ${isDanger ? 'has-danger-count' : ''} ${isActive && isDanger ? 'is-danger' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.fullLabel}
                >
                  <IconComponent size={16} />
                  <span className="mywork-tab-label">{tab.label}</span>
                  <span className="mywork-tab-badge">{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: DANH SÁCH CÔNG VIỆC CỦA TÔI */}
        {activeTab !== 'applications' && (
          <div>
            {loadingDeliverables ? (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '48px 20px',
                textAlign: 'center',
                margin: '10px 0 20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon name="hourglass" width={36} height={36} style={{ color: 'var(--primary)' }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                  Đang đồng bộ tiến độ & sản phẩm bàn giao...
                </h3>
                <p style={{ color: '#64748b', fontSize: 13.5, margin: 0 }}>
                  Vui lòng đợi trong giây lát trong khi hệ thống tải dữ liệu mới nhất.
                </p>
              </div>
            ) : activeWork.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, margin: '10px 0 30px' }}>
                {/* Hero Onboarding Empty State */}
                <div style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #e2e8f0',
                  borderRadius: 20,
                  padding: '44px 28px 36px',
                  textAlign: 'center',
                  boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '320px',
                    height: '160px',
                    background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15) 0%, rgba(255, 255, 255, 0) 70%)',
                    pointerEvents: 'none'
                  }} />

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
                    color: 'var(--primary)',
                    marginBottom: 18,
                    boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.2)',
                    position: 'relative'
                  }}>
                    <Icon name="briefcase" width={34} height={34} />
                    <span style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      background: '#10b981',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                    }}>
                      <Icon name="sparkles" width={11} height={11} />
                    </span>
                  </div>

                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                    Chưa có công việc nào đang thực hiện
                  </h3>
                  <p style={{ color: '#64748b', fontSize: 14.5, maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.6 }}>
                    Không gian làm việc là nơi bạn theo dõi hợp đồng, bàn giao các phiên bản sản phẩm và nhận thanh toán bảo đảm qua <b>Quỹ Ký Quỹ Escrow</b> sau khi được tuyển chọn.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/jobs')}
                      style={{
                        padding: '12px 24px',
                        fontSize: 14.5,
                        fontWeight: 700,
                        borderRadius: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
                      }}
                    >
                      <Icon name="search" width={16} height={16} /> Khám phá việc làm ngay
                    </button>
                    {(state.myApplications || []).length > 0 && (
                      <button
                        className="btn btn-outline"
                        onClick={() => setActiveTab('applications')}
                        style={{
                          padding: '12px 22px',
                          fontSize: 14.5,
                          fontWeight: 600,
                          borderRadius: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: '#ffffff'
                        }}
                      >
                        <Icon name="mail" width={16} height={16} /> Xem {state.myApplications.length} đơn đã ứng tuyển
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Step Micro-Job Workflow Guide */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 18,
                  padding: '28px 24px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon name="bolt" width={16} height={16} />
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        Quy trình nhận việc & Nhận thù lao an toàn 100%
                      </h4>
                    </div>
                    <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="shield-check" width={14} height={14} /> Bảo chứng bởi Quỹ Escrow SkillBridge
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 16
                  }}>
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 14,
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon name="briefcase" width={18} height={18} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>BƯỚC 01</span>
                      </div>
                      <h5 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Ứng tuyển Micro-job</h5>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                        Duyệt các dự án ngắn hạn vừa sức với lịch học, gửi mức chào giá thù lao kèm lời nhắn chứng minh năng lực.
                      </p>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 14,
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: '#f0fdf4',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon name="shield-check" width={18} height={18} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>BƯỚC 02</span>
                      </div>
                      <h5 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>NTD Ký quỹ Escrow</h5>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                        Khi chấp thuận bạn, NTD bắt buộc nạp 100% thù lao vào Quỹ bảo đảm SkillBridge. Bạn bắt tay làm không lo quỵt tiền.
                      </p>
                    </div>

                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 14,
                      padding: '20px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: '#faf5ff',
                          color: '#9333ea',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon name="wallet" width={18} height={18} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>BƯỚC 03</span>
                      </div>
                      <h5 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>Nộp bài & Nhận thù lao</h5>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                        Tải file sản phẩm lên trang này. Khi NTD bấm duyệt hoặc sau thời hạn auto-release, thù lao cộng tức thì vào Ví cá nhân.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pro Tips Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                  borderRadius: 16,
                  padding: '22px 24px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  boxShadow: '0 4px 16px rgba(30, 27, 75, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon name="graduation" width={22} height={22} style={{ color: '#fbbf24' }} />
                    </div>
                    <div>
                      <h5 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: '#ffffff' }}>
                        Bí quyết để nhanh chóng nhận được dự án đầu tiên
                      </h5>
                      <p style={{ margin: 0, fontSize: 13, color: '#c7d2fe', lineHeight: 1.4 }}>
                        Sinh viên có CV đầy đủ, xác thực tài khoản và chào giá thù lao hợp lý có tỷ lệ trúng tuyển cao gấp 3 lần!
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => navigate('/student/profile')}
                    style={{
                      background: '#ffffff',
                      color: '#312e81',
                      fontWeight: 700,
                      borderRadius: 10,
                      padding: '8px 18px',
                      border: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Hoàn thiện hồ sơ ngay →
                  </button>
                </div>

                {/* Recommended Jobs */}
                {((state.jobs || []).filter(j => j.status === 'open').length > 0) && (
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 18,
                    padding: '24px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon name="sparkles" width={18} height={18} style={{ color: 'var(--primary)' }} />
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          Gợi ý việc làm Micro-job đang mở tuyển
                        </h4>
                      </div>
                      <button
                        className="btn btn-link btn-sm"
                        onClick={() => navigate('/jobs')}
                        style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', padding: 0, textDecoration: 'none' }}
                      >
                        Xem tất cả việc làm →
                      </button>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 16
                    }}>
                      {(state.jobs || [])
                        .filter(j => j.status === 'open')
                        .slice(0, 3)
                        .map((rj) => (
                          <div
                            key={rj.id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: 14,
                              padding: '16px 18px',
                              background: '#f8fafc',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: 12,
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onClick={() => navigate(`/jobs/${rj.id}`)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.boxShadow = '0 6px 18px -4px rgba(0,0,0,0.06)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                <h5 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.4 }}>
                                  {rj.title}
                                </h5>
                                <span style={{
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  border: '1px solid #bbf7d0',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {fmtVND(rj.budget)}
                                </span>
                              </div>
                              <div style={{ fontSize: 12.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Avatar
                                  name={rj.emp || 'Nhà tuyển dụng'}
                                  src={rj.employerAvatar || rj.empAvatar || rj.employerAvatarUrl}
                                  style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }}
                                />
                                <span>{rj.emp || 'Nhà tuyển dụng'}</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icon name="clock" width={11} height={11} /> {rj.deadline || 'Thời hạn linh hoạt'}
                              </span>
                              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                Ứng tuyển <Icon name="arrow" width={11} height={11} />
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : displayedWork.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                border: '1px solid #e2e8f0',
                padding: '48px 24px',
                textAlign: 'center',
                margin: '10px 0 20px'
              }}>
                <CustomEmptyStateIllustration type={activeTab} />
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                  {activeTab === 'overdue' ? 'Không có công việc nào bị quá hạn!' :
                   activeTab === 'in_progress' ? 'Hiện không có công việc nào đang thực hiện dở dang' :
                   activeTab === 'submitted' ? 'Không có sản phẩm nào đang chờ duyệt nghiệm thu' :
                   activeTab === 'completed' ? 'Chưa có công việc nào đã hoàn thành nghiệm thu' :
                   activeTab === 'cancelled' ? 'Không có công việc nào bị hủy hoặc tranh chấp' :
                   'Không tìm thấy công việc nào'}
                </h3>
                <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 16px', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
                  {activeTab === 'overdue' ? 'Tất cả các dự án của bạn đều được quản lý đúng tiến độ cam kết.' :
                   activeTab === 'in_progress' ? 'Hãy ứng tuyển thêm công việc mới hoặc kiểm tra các đơn đã nộp để bắt đầu làm việc.' :
                   activeTab === 'completed' ? 'Sau khi Nhà tuyển dụng nghiệm thu sản phẩm, công việc sẽ xuất hiện ở đây để bạn đánh giá.' :
                   'Bạn có thể chuyển sang các tab khác hoặc xem danh sách tất cả công việc.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setActiveTab('all')}
                  >
                    Xem tất cả công việc ({workFilterCounts.all})
                  </button>
                  {activeTab === 'in_progress' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate('/jobs')}
                    >
                      Tìm việc làm ngay
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {pagedWork.map((j) => {
                  const isCompleted = j.status === 'completed';
                  const isDisputed = j.status === 'disputed' || Boolean(j.disputeInfo);
                  const isCancelled = j.status === 'cancelled';
                  const isSubmitted = !isCompleted && !isDisputed && !isCancelled && j.status === 'submitted';
                  const isRevision = !isCompleted && !isDisputed && !isCancelled && j.status === 'revision_requested';
                  const urgency = (isCompleted || isDisputed || isCancelled) ? 'normal' : getDeadlineUrgency(j.deadlineAt);
                  const isOverdue = !isCompleted && !isDisputed && !isCancelled && (urgency === 'overdue' || (j.deadlineAt && (new Date(j.deadlineAt).getTime() <= Date.now())));
                  const isInProgress = !isSubmitted && !isRevision && !isCompleted && !isDisputed && !isCancelled && !isOverdue;
                  const empName = j.emp || 'Nhà tuyển dụng';
                  const targetJobId = j.jobId || j.id;

                  return (
                    <div
                      key={j.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: 16,
                        border: isDisputed ? '2px solid #f59e0b' : (isRevision ? '2px solid #fda4af' : '1px solid #e2e8f0'),
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                    >
                      {/* Top status header */}
                      <div style={{
                        background: isDisputed ? '#fffbeb' : (isRevision ? '#fff1f2' : (isSubmitted ? '#f0fdf4' : '#f8fafc')),
                        padding: '12px 24px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 6
                          }}>
                            {j.cat}
                          </span>
                          <span style={{
                            fontSize: 12,
                            color: '#16a34a',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#dcfce7',
                            padding: '3px 9px',
                            borderRadius: 6,
                            border: '1px solid #bbf7d0'
                          }} title="Thù lao đã được NTD nạp và SkillBridge khóa ký quỹ an toàn 100%">
                            <Icon name="shield-check" width={13} height={13} />
                            Đã bảo chứng ký quỹ Escrow: {fmtVND(j.budget)}
                          </span>
                        </div>

                        <div>
                          {isCancelled && (
                            <span style={{ background: '#64748b', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đã hủy công việc
                            </span>
                          )}
                          {isDisputed && (
                            <span style={{ background: '#d97706', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <CustomIconCancelled size={13} color="#ffffff" />
                              <span>Đang khiếu nại (Trọng tài xử lý)</span>
                            </span>
                          )}
                          {isRevision && (
                            <span style={{ background: '#f43f5e', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Yêu cầu sửa đổi (Lượt {(j.revisionCount || 0) + 1}/{j.revisionLimit || 2})
                            </span>
                          )}
                          {isSubmitted && (
                            <span style={{ background: '#0284c7', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đã nộp bàn giao (Chờ duyệt)
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{ background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đã hoàn thành
                            </span>
                          )}
                          {isInProgress && (
                            <span style={{ background: '#4f46e5', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đang thực hiện
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ background: '#be123c', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                              Đã quá hạn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Card Content */}
                      <div style={{ padding: '22px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                          <div style={{ flex: 1, minWidth: 260 }}>
                            <h2
                              style={{
                                fontSize: 20,
                                fontWeight: 800,
                                margin: '0 0 10px',
                                color: '#1e293b',
                                cursor: 'pointer',
                                lineHeight: 1.3
                              }}
                              onClick={() => targetJobId && navigate(`/jobs/${targetJobId}`)}
                            >
                              {j.title}
                            </h2>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar name={empName} src={j.empAvatar || j.employerAvatar || j.employerAvatarUrl} fontSize={13} style={{ width: 26, height: 26 }} />
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#475569' }}>{empName}</span>
                              </div>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <div style={{
                                background: '#ecfdf5',
                                color: '#047857',
                                fontWeight: 800,
                                fontSize: 14,
                                padding: '4px 10px',
                                borderRadius: 8
                              }}>
                                Thù lao: {fmtVND(j.budget)}
                              </div>
                              {j.deadlineAt && (
                                <>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <div style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    background: isCompleted ? '#ecfdf5' : (isOverdue ? '#fee2e2' : (urgency === 'urgent' ? '#ffedd5' : '#f0f9ff')),
                                    color: isCompleted ? '#059669' : (isOverdue ? '#b91c1c' : (urgency === 'urgent' ? '#c2410c' : '#0369a1')),
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}>
                                    <Icon name={isCompleted ? "check" : "clock"} width={13} height={13} /> {isCompleted ? 'Nghiệm thu hoàn tất' : `Hạn bàn giao: ${formatDeadline(j.deadlineAt)}`}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Timeline Progress */}
                        <div style={{
                          background: '#f8fafc',
                          borderRadius: 12,
                          padding: '14px 18px',
                          margin: '12px 0 16px',
                          border: '1px solid #f1f5f9'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                            {/* Line */}
                            <div style={{
                              position: 'absolute',
                              top: 14,
                              left: 20,
                              right: 20,
                              height: 3,
                              background: '#e2e8f0',
                              zIndex: 1
                            }}>
                              <div style={{
                                height: '100%',
                                width: isCompleted ? '100%' : (isSubmitted ? '70%' : (isInProgress ? '35%' : '15%')),
                                background: isCompleted ? '#10b981' : 'linear-gradient(90deg, #10b981, #6366f1)',
                                transition: 'width 0.3s'
                              }} />
                            </div>

                            {/* Step 1 */}
                            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: '#10b981',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 4px'
                              }}>
                                <Icon name="check" width={14} height={14} />
                              </div>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#10b981' }}>Nhận việc & Ký quỹ</span>
                            </div>

                            {/* Step 2 */}
                            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: (isCompleted || isSubmitted) ? '#10b981' : (isRevision ? '#f43f5e' : '#6366f1'),
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                margin: '0 auto 4px',
                                boxShadow: '0 0 0 3px #fff'
                              }}>
                                {(isCompleted || isSubmitted) ? <Icon name="check" width={14} height={14} /> : (isRevision ? <Icon name="edit" width={13} height={13} /> : '2')}
                              </div>
                              <span style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: (isCompleted || isSubmitted) ? '#059669' : (isRevision ? '#f43f5e' : '#4338ca')
                              }}>
                                {isCompleted ? 'Đã bàn giao' : (isRevision ? 'Yêu cầu sửa đổi' : (isSubmitted ? 'Đã nộp bàn giao' : 'Đang thực hiện'))}
                              </span>
                            </div>

                            {/* Step 3 */}
                            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isCompleted ? '#10b981' : (isSubmitted ? '#6366f1' : '#e2e8f0'),
                                color: (isCompleted || isSubmitted) ? '#fff' : '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                fontWeight: 700,
                                margin: '0 auto 4px',
                                boxShadow: '0 0 0 3px #fff'
                              }}>
                                {isCompleted ? <Icon name="check" width={14} height={14} /> : '3'}
                              </div>
                              <span style={{ fontSize: 11.5, fontWeight: isCompleted ? 700 : 600, color: isCompleted ? '#059669' : (isSubmitted ? '#4338ca' : '#94a3b8') }}>
                                {isCompleted ? 'Nghiệm thu & Tất toán' : 'Nghiệm thu & Nhận tiền'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Completed Review Promotion Banner */}
                        {isCompleted && (() => {
                          const jobReview = jobReviewsMap[targetJobId];
                          const hasReviewed = Boolean(jobReview?.hasReviewed || jobReview?.myReview);
                          const completedDate = j.completedAt
                            || jobReview?.jobCompletedAt
                            || (j.deliverable?.updatedAt || j.deliverable?.submittedAt || j.deliverable?.createdAt);

                          const countdown = getBonusCountdown(completedDate, now);
                          const isWithin3Days = jobReview?.canEarnBonusPoints !== undefined
                            ? (jobReview.canEarnBonusPoints && (!countdown || countdown.isWithin3Days))
                            : (countdown ? countdown.isWithin3Days : false);

                          const timeRemainingText = countdown ? countdown.text : '';

                          return (
                            <div style={{
                              background: hasReviewed
                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.12) 100%)'
                                : 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.15) 100%)',
                              border: `1.5px solid ${hasReviewed ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.5)'}`,
                              borderRadius: 12,
                              padding: '14px 18px',
                              margin: '12px 0 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 12
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                                <CustomIconCompleted size={28} color={hasReviewed ? '#15803d' : '#ca8a04'} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: hasReviewed ? '#15803d' : '#a16207' }}>
                                      {hasReviewed ? `Bạn đã gửi đánh giá (${jobReview?.myReview?.stars || 5}/5 sao) cho Nhà tuyển dụng!` : 'Dự án đã hoàn thành & tất toán thành công!'}
                                    </span>
                                    {!hasReviewed && (
                                      <span style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        background: isWithin3Days ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.15)',
                                        color: isWithin3Days ? '#a16207' : '#854d0e',
                                        border: `1px solid ${isWithin3Days ? 'rgba(234, 179, 8, 0.4)' : 'rgba(234, 179, 8, 0.3)'}`
                                      }}>
                                        {isWithin3Days ? `⭐ Thưởng +5đ (${timeRemainingText})` : 'Hết hạn +5đ thưởng'}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 12.5, color: hasReviewed ? '#166534' : '#854d0e', marginTop: 2 }}>
                                    {hasReviewed
                                      ? (jobReview?.myReview?.comment ? `"${jobReview.myReview.comment}"` : 'Cảm ơn bạn đã đóng góp phản hồi tích cực.')
                                      : isWithin3Days
                                        ? `Đánh giá Nhà tuyển dụng trong 3 ngày (${timeRemainingText}) để nhận thêm +5 điểm uy tín (Reliability Score).`
                                        : 'Đã quá thời hạn 3 ngày nhận điểm thưởng (+5đ). Bạn vẫn có thể gửi đánh giá nhận xét cho đối tác.'}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  background: hasReviewed ? '#15803d' : '#ca8a04',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  border: 'none',
                                  padding: '8px 18px',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  boxShadow: hasReviewed ? 'none' : '0 2px 8px rgba(202, 138, 4, 0.3)'
                                }}
                                onClick={() => openModal('review', {
                                  jobTitle: j.title,
                                  withName: empName,
                                  direction: 'toEmployer',
                                  dashJobId: targetJobId,
                                  completedAt: completedDate,
                                  isWithin3Days: isWithin3Days,
                                  remainingHours: countdown?.remainingHours,
                                  canEarnBonus: isWithin3Days,
                                  existingReview: jobReview?.myReview,
                                  onReviewed: () => {
                                    refreshMyApplications?.();
                                    loadJobReview(targetJobId);
                                  }
                                })}
                              >
                                <Icon name="star" width={14} height={14} style={{ fill: '#fff', stroke: '#fff' }} />
                                {hasReviewed
                                  ? 'Xem lại đánh giá'
                                  : isWithin3Days
                                    ? 'Đánh giá (+5đ uy tín)'
                                    : 'Đánh giá Nhà tuyển dụng'}
                              </button>
                            </div>
                          );
                        })()}

                        {/* Submitted Awaiting Acceptance Banner */}
                        {isSubmitted && (
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(3, 105, 161, 0.12) 100%)',
                            border: '1.5px solid rgba(2, 132, 199, 0.35)',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '12px 0 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 12
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
                              <span style={{ fontSize: 24 }}>⏳</span>
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0369a1' }}>
                                  Đã bàn giao sản phẩm — Đang chờ Nhà tuyển dụng nghiệm thu
                                </div>
                                <div style={{ fontSize: 12, color: '#075985', marginTop: 2 }}>
                                  Tiền thù lao <b>{fmtVND(j.budget)}</b> đang được bảo đảm an toàn trong Quỹ Ký Quỹ Escrow. Sau khi NTD bấm nghiệm thu, tiền sẽ về ví của bạn và nút Đánh giá NTD sẽ mở.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                fontWeight: 700,
                                border: 'none',
                                padding: '7px 16px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
                              }}
                              onClick={() => openChatWithPerson(empName, `Chào ${empName}, em đã gửi sản phẩm bàn giao cho dự án "${j.title}". Anh/chị kiểm tra và nghiệm thu giải ngân giúp em nhé!`)}
                            >
                              <Icon name="chat" width={14} height={14} style={{ fill: '#fff', stroke: '#fff' }} />
                              Nhắc NTD nghiệm thu
                            </button>
                          </div>
                        )}

                        {/* Overdue Alert Banner (Only for uncompleted jobs) */}
                        {isOverdue && (
                          <div style={{
                            background: '#fff1f2',
                            border: '1.5px solid #fda4af',
                            borderRadius: 12,
                            padding: '12px 16px',
                            margin: '12px 0 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                              <Icon name="clock" width={22} height={22} style={{ color: '#be123c', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#be123c' }}>
                                  Đã quá hạn bàn giao ({formatDeadline(j.deadlineAt)})
                                </div>
                                <div style={{ fontSize: 12, color: '#9f1239', marginTop: 2 }}>
                                  Hệ thống tạm khóa tính năng nộp và cập nhật sản phẩm. Vui lòng nhắn tin trao đổi với Nhà tuyển dụng để được hỗ trợ gia hạn thêm deadline.
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                background: '#be123c',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '7px 14px',
                                borderRadius: 8,
                                cursor: 'pointer'
                              }}
                              onClick={() => openChatWithPerson(empName, `Chào ${empName}, dự án "${j.title}" của em hiện đã đến hạn deadline (${formatDeadline(j.deadlineAt)}). Em xin phép trao đổi để gia hạn thêm thời gian hoàn thành.`)}
                            >
                              <Icon name="chat" width={14} height={14} /> Nhắn tin xin gia hạn
                            </button>
                          </div>
                        )}

                        {/* Dispute Banner */}
                        {isDisputed && (
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.12) 100%)',
                            border: '1.5px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: 14,
                            padding: '16px 20px',
                            margin: '12px 0 16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CustomIconCancelled size={26} color="#d97706" />
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#b45309' }}>
                                    Vụ việc đang được Ban Trọng tài SkillBridge thụ lý
                                  </div>
                                  <div style={{ fontSize: 12.5, color: '#92400e', marginTop: 2 }}>
                                    Tiền ký quỹ Escrow đang được phong tỏa bảo vệ quyền lợi hai bên. Bấm vào hồ sơ để xem chi tiết hoặc nộp bổ sung chứng cứ trong hạn 72 giờ.
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{
                                  background: '#d97706',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                  border: 'none',
                                  padding: '7px 16px',
                                  borderRadius: 8,
                                  cursor: 'pointer'
                                }}
                                onClick={() => setDisputeDetailModalId(j.disputeId || j.jobId)}
                              >
                                Xem hồ sơ khiếu nại
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Job Description & Requirements block */}
                        {(j.desc || (j.req && j.req.length > 0)) && (
                          <div style={{
                            background: '#f8fafc',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '12px 0 14px',
                            border: '1px solid #e2e8f0'
                          }}>
                            {j.desc && (
                              <div style={{ marginBottom: j.req?.length ? 10 : 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                                  Mô tả công việc:
                                </div>
                                <p style={{ margin: 0, fontSize: 13.5, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                  {j.desc}
                                </p>
                              </div>
                            )}

                            {j.req && j.req.length > 0 && (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                                  Yêu cầu bàn giao:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {j.req.map((r, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
                                      <Icon name="check" width={12} height={12} style={{ color: '#10b981' }} /> {r}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Employer Attachments / Tài liệu & Đề bài đính kèm */}
                        {j.attachments && j.attachments.length > 0 && (
                          <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '12px 0 14px'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: 10
                            }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Icon name="paperclip" width={14} height={14} /> Tài liệu & Đề bài từ NTD ({j.attachments.length} file)
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {j.attachments.map((f) => (
                                <div
                                  key={f.id || f.fileName}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: '#ffffff',
                                    border: '1px solid #e0f2fe',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    flexWrap: 'wrap',
                                    gap: 8
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, flex: 1 }}>
                                    <Icon name="folder" width={18} height={18} style={{ color: '#0284c7', flexShrink: 0 }} />
                                    <div style={{ overflow: 'hidden' }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {f.fileName || f.name}
                                      </div>
                                      <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                        {(f.fileSize || f.size) ? ((f.fileSize || f.size) > 1024 * 1024 ? ((f.fileSize || f.size) / (1024 * 1024)).toFixed(1) + ' MB' : ((f.fileSize || f.size) / 1024).toFixed(0) + ' KB') : 'File đính kèm'}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    style={{
                                      fontSize: 12,
                                      padding: '4px 10px',
                                      borderColor: '#0284c7',
                                      color: '#0284c7',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                    onClick={async () => {
                                      showToast(`Đang tải file: ${f.fileName || f.name}`);
                                      await downloadJobAttachment(f, j.title, targetJobId);
                                    }}
                                  >
                                    Tải file về
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}



                        {/* Revision feedback alert box */}
                        {isRevision && j.deliverableFeedback?.length > 0 && (
                          <div style={{
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '14px 0',
                            fontSize: 13
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e11d48', fontWeight: 700, marginBottom: 4 }}>
                              <Icon name="edit" width={14} height={14} /> <span>Góp ý từ Nhà tuyển dụng (Lần {j.deliverableFeedback[j.deliverableFeedback.length - 1].version || 1}):</span>
                            </div>
                            <p style={{ margin: 0, color: '#9f1239', lineHeight: 1.5, fontWeight: 500 }}>
                              "{j.deliverableFeedback[j.deliverableFeedback.length - 1].text}"
                            </p>
                          </div>
                        )}

                        {/* DELIVERABLE SHOWCASE SECTION */}
                        {j.deliverable ? (
                          <div style={{
                            background: '#ffffff',
                            border: isRevision ? '1.5px solid #fda4af' : (isSubmitted ? '1.5px solid #bae6fd' : '1px solid #e2e8f0'),
                            borderRadius: 14,
                            margin: '16px 0 12px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                          }}>
                            {/* Deliverable Header */}
                            <div style={{
                              padding: '12px 18px',
                              background: isRevision
                                ? 'linear-gradient(135deg, #fff1f2, #ffe4e6)'
                                : (isSubmitted ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : '#f8fafc'),
                              borderBottom: isRevision ? '1px solid #fecdd3' : (isSubmitted ? '1px solid #bae6fd' : '1px solid #e2e8f0'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 10
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon name="archive" width={20} height={20} style={{ color: 'var(--primary)' }} />
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                                    Sản phẩm bàn giao (Phiên bản v{j.deliverable.version || 1})
                                  </div>
                                  {j.deliverable.submittedAt && (
                                    <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                      <Icon name="clock" width={11} height={11} /> Đã nộp lúc: {formatDateTime(j.deliverable.submittedAt)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {isSubmitted && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                                  }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                                    Đang chờ NTD nghiệm thu
                                  </span>
                                )}
                                {isRevision && (
                                  <span style={{
                                    background: '#e11d48',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}>
                                    <Icon name="edit" width={12} height={12} /> Cần nộp lại bản sửa
                                  </span>
                                )}
                                {isCompleted && (
                                  <span style={{
                                    background: '#059669',
                                    color: '#ffffff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: 20
                                  }}>
                                    Đã nghiệm thu
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Deliverable Body */}
                            <div style={{ padding: '16px 18px' }}>
                              {/* Asset Info Card */}
                              {(() => {
                                const fileMeta = getDeliverableFileMeta(j.deliverable.fileName, j.deliverable.fileType);
                                const isExternal = j.deliverable.mode === 'link' || (!j.deliverable.previewFileUrl && j.deliverable.externalUrl) || j.deliverable.fileType === 'url';
                                const assetUrl = j.deliverable.url || j.deliverable.externalUrl || j.deliverable.previewFileUrl;

                                return (
                                  <div style={{
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    marginBottom: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: 12
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 240 }}>
                                      <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        background: fileMeta.bg,
                                        color: fileMeta.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                      }}>
                                        <Icon name={fileMeta.icon} width={22} height={22} />
                                      </div>
                                      <div style={{ overflow: 'hidden' }}>
                                        <div style={{
                                          fontSize: 13.5,
                                          fontWeight: 700,
                                          color: '#1e293b',
                                          wordBreak: 'break-all'
                                        }}>
                                          {formatDeliverableDisplayName(j.deliverable.fileName, targetJobId, j.deliverable.version, isExternal)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2, fontSize: 11.5, color: '#64748b' }}>
                                          <span style={{ fontWeight: 600, color: fileMeta.color }}>{fileMeta.label}</span>
                                          {j.deliverable.fileSize && (
                                            <>
                                              <span>•</span>
                                              <span>{formatFileSize(j.deliverable.fileSize)}</span>
                                            </>
                                          )}
                                          <span>•</span>
                                          <span>{isExternal ? 'Liên kết ngoài' : 'Tệp đính kèm'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      {isExternal ? (
                                        <a
                                          href={assetUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-outline btn-sm"
                                          style={{
                                            fontSize: 12,
                                            padding: '6px 14px',
                                            borderColor: '#4338ca',
                                            color: '#4338ca',
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontWeight: 600
                                          }}
                                        >
                                          Mở liên kết
                                        </a>
                                      ) : (!j.deliverable.previewFileUrl && !j.deliverable.finalFileUrl) ? (
                                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '6px 10px' }}>
                                          (Đã lưu trữ)
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn btn-outline btn-sm"
                                          style={{
                                            fontSize: 12,
                                            padding: '6px 14px',
                                            borderColor: '#0284c7',
                                            color: '#0284c7',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            fontWeight: 600
                                          }}
                                          onClick={async () => {
                                            showToast(`Đang tải file: ${j.deliverable.fileName || 'deliverable.zip'}`);
                                            await downloadDeliverableFile(targetJobId, j.deliverable.id, j.deliverable.fileName, 'final');
                                          }}
                                        >
                                          Tải file đã nộp
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Protected Live Preview */}
                              <div style={{ marginBottom: 14 }}>
                                <DeliverablePreview d={j.deliverable} revealFinal={isCompleted} />
                              </div>

                              {/* Student Note */}
                              {j.deliverable.note ? (
                                <div style={{
                                  background: '#f8fafc',
                                  borderLeft: '4px solid #4338ca',
                                  borderRadius: '0 8px 8px 0',
                                  padding: '10px 14px',
                                  marginBottom: 14,
                                  fontSize: 13
                                }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span>Ghi chú bàn giao:</span>
                                  </div>
                                  <div style={{ color: '#334155', fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                    "{j.deliverable.note}"
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  fontSize: 12,
                                  color: '#94a3b8',
                                  fontStyle: 'italic',
                                  marginBottom: 14
                                }}>
                                  (Bạn không để lại ghi chú khi nộp sản phẩm này)
                                </div>
                              )}

                              {/* Version History Toggle & Details (If more than 1 version) */}
                              {j.allDeliverables && j.allDeliverables.length > 1 && (
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedVersions(prev => ({ ...prev, [targetJobId]: !prev[targetJobId] }))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#4338ca',
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      padding: 0
                                    }}
                                  >
                                    <span>{expandedVersions[targetJobId] ? 'Thu gọn' : 'Xem'} lịch sử bàn giao ({j.allDeliverables.length})</span>
                                  </button>

                                  {expandedVersions[targetJobId] && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                                      {j.allDeliverables.map((vItem) => (
                                        <div
                                          key={vItem.id || vItem.version}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: vItem.version === j.deliverable.version ? '#eef2ff' : '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            flexWrap: 'wrap',
                                            gap: 8
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 700, color: '#4338ca' }}>v{vItem.version}</span>
                                            <span style={{ color: '#334155' }}>{formatDeliverableDisplayName(vItem.fileName, targetJobId, vItem.version, vItem.fileType === 'url')}</span>
                                            <span style={{ color: '#94a3b8' }}>• {formatDateTime(vItem.submittedAt)}</span>
                                            {vItem.version === j.deliverable.version && (
                                              <span style={{ background: '#c7d2fe', color: '#3730a3', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}>
                                                Mới nhất
                                              </span>
                                            )}
                                          </div>
                                          {vItem.id && (
                                            <button
                                              type="button"
                                              className="btn btn-outline btn-sm"
                                              style={{ fontSize: 11, padding: '2px 8px' }}
                                              onClick={() => downloadDeliverableFile(targetJobId, vItem.id, vItem.fileName, 'final')}
                                            >
                                              Tải v{vItem.version}
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : isSubmitted ? (
                          /* Fallback card if job is submitted but deliverable object is pending */
                          <div style={{
                            background: '#f0f9ff',
                            border: '1.5px solid #bae6fd',
                            borderRadius: 14,
                            padding: '16px 20px',
                            margin: '16px 0 12px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1' }}>
                                  Dự án đã bàn giao
                                </div>
                                <div style={{ fontSize: 12.5, color: '#0284c7', marginTop: 2 }}>
                                  Đang chờ nhà tuyển dụng xem xét nghiệm thu.
                                </div>
                              </div>
                              <span style={{
                                background: '#0284c7',
                                color: '#ffffff',
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '4px 12px',
                                borderRadius: 20
                              }}>
                                Chờ nghiệm thu
                              </span>
                            </div>
                          </div>
                        ) : null}

                        {isSubmitted && !isDisputed && (
                          <div style={{
                            background: 'rgba(2, 132, 199, 0.08)',
                            border: '1px solid rgba(2, 132, 199, 0.3)',
                            borderRadius: 12,
                            padding: '14px 18px',
                            margin: '14px 0 10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12
                          }}>
                            <span style={{ fontSize: 24 }}>⏳</span>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0369a1' }}>
                                Đã nộp sản phẩm — Đang trong thời hạn kiểm tra nghiệm thu (72 giờ)
                              </div>
                              <div style={{ fontSize: 12, color: '#0c4a6e', marginTop: 2 }}>
                                Nhà tuyển dụng có 72 giờ để đánh giá hoặc yêu cầu sửa đổi. Nếu quá 72h đối tác không phản hồi, hệ thống SkillBridge sẽ tự động tất toán 100% tiền ký quỹ vào ví của bạn.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Extension Request Status Banner */}
                        {(() => {
                          const ext = extensionsMap[targetJobId];
                          if (!ext) return null;
                          if (ext.status === 'pending') {
                            return (
                              <div style={{
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: 12,
                                padding: '12px 16px',
                                margin: '12px 0 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                  <span style={{ fontSize: 20 }}>🕒</span>
                                  <div style={{ fontSize: 12.5, color: '#4338ca' }}>
                                    <strong>Đề xuất gia hạn (+{ext.additionalDays} ngày):</strong> Đang chờ Nhà tuyển dụng phê duyệt. (Lý do: "{ext.detailReason || ext.reason}")
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ fontSize: 11.5, padding: '4px 10px', color: '#6366f1', borderColor: '#c7d2fe' }}
                                  onClick={() => handleCancelExtension(targetJobId, ext.id)}
                                >
                                  Thu hồi
                                </button>
                              </div>
                            );
                          }
                          if (ext.status === 'accepted') {
                            return (
                              <div style={{
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: 12,
                                padding: '12px 16px',
                                margin: '12px 0 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                              }}>
                                <span style={{ fontSize: 20 }}>✅</span>
                                <div style={{ fontSize: 12.5, color: '#047857' }}>
                                  <strong>Đã gia hạn thành công:</strong> Nhà tuyển dụng đã chấp thuận gia hạn thêm +{ext.additionalDays} ngày cho công việc này.
                                </div>
                              </div>
                            );
                          }
                          if (ext.status === 'rejected') {
                            return (
                              <div style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 12,
                                padding: '12px 16px',
                                margin: '12px 0 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                              }}>
                                <span style={{ fontSize: 20 }}>❌</span>
                                <div style={{ fontSize: 12.5, color: '#b91c1c' }}>
                                  <strong>Đề xuất gia hạn không được chấp thuận:</strong> {ext.rejectionReason || 'Vui lòng hoàn thành theo hạn chót ban đầu.'}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}



                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                          {isRevision && (
                            isOverdue ? (
                              <button
                                className="btn btn-primary"
                                style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.75, fontWeight: 700, border: 'none' }}
                                disabled={true}
                                title="Đã quá hạn bàn giao, vui lòng xin gia hạn deadline từ NTD"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Icon name="lock" width={13} height={13} /> Đã quá hạn — Khóa nộp bài sửa
                                </span>
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', fontWeight: 700 }}
                                onClick={() => handleOpenDeliverableModal(targetJobId, j)}
                              >
                                Nộp lại bài sửa (Lượt {(j.revisionCount || 0) + 1}/{j.revisionLimit || 2})
                              </button>
                            )
                          )}
                          {isSubmitted && (
                            isOverdue ? (
                              <button
                                className="btn btn-outline"
                                style={{ borderColor: '#cbd5e1', color: '#94a3b8', cursor: 'not-allowed', opacity: 0.75, fontWeight: 600 }}
                                disabled={true}
                                title="Đã quá hạn bàn giao, không thể cập nhật thêm"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Icon name="lock" width={13} height={13} /> Đã quá hạn — Khóa cập nhật
                                </span>
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline"
                                style={{ borderColor: '#4338ca', color: '#4338ca', fontWeight: 600 }}
                                onClick={() => handleOpenDeliverableModal(targetJobId, j)}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Icon name="edit" width={13} height={13} /> Cập nhật file / link bàn giao
                                </span>
                              </button>
                            )
                          )}
                          {isInProgress && (
                            isOverdue ? (
                              <button
                                className="btn btn-primary"
                                style={{ background: '#94a3b8', cursor: 'not-allowed', opacity: 0.75, fontWeight: 700, border: 'none' }}
                                disabled={true}
                                title="Đã quá hạn bàn giao, vui lòng xin gia hạn deadline từ NTD"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Icon name="lock" width={13} height={13} /> Đã quá hạn — Khóa nộp sản phẩm
                                </span>
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary"
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)', fontWeight: 700 }}
                                onClick={() => handleOpenDeliverableModal(targetJobId, j)}
                              >
                                Nộp bàn giao / sản phẩm
                              </button>
                            )
                          )}

                          {isCompleted && (() => {
                            const jobReview = jobReviewsMap[targetJobId];
                            const hasReviewed = Boolean(jobReview?.hasReviewed || jobReview?.myReview);
                            const completedDate = j.completedAt
                              || jobReview?.jobCompletedAt
                              || (j.deliverable?.updatedAt || j.deliverable?.submittedAt || j.deliverable?.createdAt);

                            const countdown = getBonusCountdown(completedDate, now);
                            const isWithin3Days = jobReview?.canEarnBonusPoints !== undefined
                              ? (jobReview.canEarnBonusPoints && (!countdown || countdown.isWithin3Days))
                              : (countdown ? countdown.isWithin3Days : false);

                            return (
                              <button
                                className={hasReviewed ? 'btn btn-outline' : 'btn'}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontWeight: 700,
                                  ...(hasReviewed
                                    ? {}
                                    : {
                                        background: '#ca8a04',
                                        color: '#ffffff',
                                        border: 'none',
                                        boxShadow: '0 2px 8px rgba(202, 138, 4, 0.3)'
                                      })
                                }}
                                onClick={() => openModal('review', {
                                  jobTitle: j.title,
                                  withName: empName,
                                  direction: 'toEmployer',
                                  dashJobId: targetJobId,
                                  jobId: targetJobId,
                                  completedAt: completedDate,
                                  isWithin3Days: isWithin3Days,
                                  remainingHours: countdown?.remainingHours,
                                  canEarnBonus: isWithin3Days,
                                  existingReview: jobReview?.myReview,
                                  onReviewed: () => {
                                    refreshMyApplications?.();
                                    loadJobReview(targetJobId);
                                  }
                                })}
                              >
                                <Icon
                                  name="star"
                                  width={14}
                                  height={14}
                                  style={{
                                    fill: hasReviewed ? '#15803d' : '#ffffff',
                                    stroke: hasReviewed ? '#15803d' : '#ffffff'
                                  }}
                                />
                                {hasReviewed
                                  ? `Đã đánh giá (${jobReview?.myReview?.stars || 5}⭐)`
                                  : isWithin3Days
                                    ? 'Đánh giá (+5đ uy tín)'
                                    : 'Đánh giá Nhà tuyển dụng'}
                              </button>
                            );
                          })()}

                          <button
                            className="btn btn-outline"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => openChatWithPerson(empName, `Chào ${empName}, em đã gửi sản phẩm bàn giao cho dự án "${j.title}". Anh/chị kiểm tra và nghiệm thu giúp em nhé!`)}
                          >
                            <Icon name="chat" width={13} height={13} /> Chat với NTD
                          </button>

                          <button
                            className="btn btn-outline"
                            style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            onClick={() => targetJobId && navigate(`/jobs/${targetJobId}`)}
                          >
                            <Icon name="eye" width={13} height={13} /> Xem chi tiết tin
                          </button>

                          {['in_progress', 'revision_requested'].includes(j.status) && !isDisputed && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ color: '#4f46e5', borderColor: '#c7d2fe', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                              onClick={() => openModal('deadlineExtension', {
                                job: j,
                                onSuccess: () => setExtensionRefreshTrigger((t) => t + 1)
                              })}
                              title="Gửi đề xuất xin thêm thời gian hoàn thành"
                            >
                              <Icon name="clock" width={13} height={13} /> Xin gia hạn deadline
                            </button>
                          )}

                          {['in_progress', 'submitted', 'revision_requested'].includes(j.status) && (
                            <button
                              className="btn btn-outline"
                              style={{ color: '#d97706', borderColor: '#fcd34d', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                              onClick={() => setDisputeModalJob(j)}
                              title="Mở hồ sơ khiếu nại gửi lên Ban Trọng tài SkillBridge"
                            >
                              <CustomIconCancelled size={14} color="#d97706" /> Khiếu nại công việc
                            </button>
                          )}

                          {j.status === 'disputed' && (
                            <button
                              className="btn btn-primary"
                              style={{ background: '#d97706', borderColor: '#d97706', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                              onClick={() => setDisputeDetailModalId(j.disputeId || j.jobId)}
                              title="Xem chi tiết hồ sơ tranh chấp & nộp bằng chứng trong 72h"
                            >
                              <CustomIconCancelled size={14} color="#ffffff" /> Xem hồ sơ tranh chấp
                            </button>
                          )}

                          {['in_progress', 'revision_requested'].includes(j.status) && !isDisputed && (
                            <button
                              className="btn btn-outline"
                              style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setCancelModalJob(j)}
                            >
                              <Icon name="ban" width={12} height={12} /> Hủy nhận việc
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 20 }}>
                <Pagination
                  currentPage={workPage}
                  totalPages={workTotalPages}
                  totalItems={displayedWork.length}
                  pageSize={workPageSize}
                  onPageChange={(p) => {
                    setWorkPage(p);
                    window.scrollTo({ top: 160, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(sz) => { setWorkPageSize(sz); setWorkPage(1); }}
                  pageSizeOptions={[1, 2, 3, 5]}
                  itemLabel="công việc"
                />
              </div>
            </>
          )}
          </div>
        )}

        {/* TAB 2: TẤT CẢ ĐƠN ỨNG TUYỂN */}
        {activeTab === 'applications' && (
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '28px 24px' }}>
            {/* Filter toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 10, padding: '7px 14px', fontWeight: 600 }}
                  onClick={() => { setAppFilter('all'); setAppsPage(1); }}
                >
                  Tất cả ({state.myApplications.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 10, padding: '7px 14px', fontWeight: 600 }}
                  onClick={() => { setAppFilter('pending'); setAppsPage(1); }}
                >
                  Đang chờ duyệt ({state.myApplications.filter(a => a.status === 'pending').length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'hired' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 10, padding: '7px 14px', fontWeight: 600 }}
                  onClick={() => { setAppFilter('hired'); setAppsPage(1); }}
                >
                  Đã được chọn ({state.myApplications.filter(a => ['hired', 'submitted', 'revision_requested', 'completed'].includes(a.status)).length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appFilter === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 10, padding: '7px 14px', fontWeight: 600 }}
                  onClick={() => { setAppFilter('rejected'); setAppsPage(1); }}
                >
                  Chưa phù hợp ({state.myApplications.filter(a => a.status === 'rejected').length})
                </button>
              </div>

              <div style={{ position: 'relative', minWidth: 260 }}>
                <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Icon name="search" width={14} height={14} />
                </div>
                <input
                  type="text"
                  placeholder="Tìm theo tên việc hoặc NTD..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setAppsPage(1); }}
                  style={{
                    padding: '9px 14px 9px 34px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    fontSize: 13,
                    width: '100%',
                    background: '#f8fafc',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => { e.target.style.background = '#ffffff'; e.target.style.borderColor = 'var(--primary)'; }}
                  onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#cbd5e1'; }}
                />
              </div>
            </div>

            {/* List */}
            {filteredApplications.length === 0 ? (
              (state.myApplications || []).length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                  borderRadius: 16,
                  border: '1px dashed #cbd5e1'
                }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: 16,
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Icon name="mail" width={28} height={28} />
                  </div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
                    Bạn chưa có đơn ứng tuyển nào
                  </h4>
                  <p style={{ color: '#64748b', fontSize: 14, maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
                    Khám phá hàng chục dự án Micro-job đang mở tuyển, ứng tuyển ngay để được NTD ký quỹ và nhận thù lao hấp dẫn.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate('/jobs')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, fontWeight: 700 }}
                  >
                    <Icon name="search" width={14} height={14} /> Khám phá việc làm ngay
                  </button>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '44px 20px',
                  background: '#f8fafc',
                  borderRadius: 14,
                  border: '1px dashed #cbd5e1'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <Icon name="search" width={32} height={32} style={{ color: '#94a3b8' }} />
                  </div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                    Không tìm thấy đơn ứng tuyển nào phù hợp
                  </h4>
                  <p style={{ fontSize: 13.5, color: '#64748b', maxWidth: 400, margin: '0 auto 16px' }}>
                    Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm đặt lại bộ lọc để xem toàn bộ danh sách.
                  </p>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => { setAppFilter('all'); setSearchQuery(''); setAppsPage(1); }}
                    style={{ borderRadius: 8 }}
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pagedApplications.map((a) => {
                  const statusMeta = getApplicationStatusMeta(a.status, a.jobStatus);
                  const isHiredOrActive = ['hired', 'submitted', 'revision_requested', 'completed'].includes(a.status);
                  const isCompleted = a.status === 'completed';
                  const appTargetJobId = a.jobId || a.id;
                  const appReview = jobReviewsMap[appTargetJobId];
                  const hasAppReviewed = Boolean(appReview?.hasReviewed || appReview?.myReview);

                  return (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 20px',
                        borderRadius: 14,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        flexWrap: 'wrap',
                        gap: 16
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = '0 6px 18px -4px rgba(0,0,0,0.07)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Left info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 280 }}>
                        <Avatar
                          name={a.employerName || a.emp || 'Nhà tuyển dụng'}
                          src={a.employerAvatarUrl || a.employerAvatar || a.empAvatar || (state.jobs || []).find((sj) => sj.id === a.jobId)?.employerAvatar || (state.jobs || []).find((sj) => sj.id === a.jobId)?.empAvatar}
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: '#0f172a',
                              cursor: a.jobId ? 'pointer' : 'default',
                              lineHeight: 1.4,
                              transition: 'color 0.15s ease'
                            }}
                            onClick={() => a.jobId && navigate(`/jobs/${a.jobId}`)}
                            onMouseEnter={(e) => a.jobId && (e.currentTarget.style.color = 'var(--primary)')}
                            onMouseLeave={(e) => a.jobId && (e.currentTarget.style.color = '#0f172a')}
                          >
                            {a.jobTitle || a.title || 'Công việc'}
                          </div>

                          <div style={{
                            fontSize: 12.5,
                            color: '#64748b',
                            marginTop: 5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap'
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#334155' }}>
                              <Icon name="building" width={13} height={13} style={{ color: '#64748b' }} />
                              {a.employerName || a.emp || 'Nhà tuyển dụng'}
                            </span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontWeight: 700,
                              fontSize: 12.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Icon name="wallet" width={11} height={11} /> {fmtVND(a.budget)}
                            </span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Icon name="clock" width={12} height={12} /> {a.appliedAt || 'Gần đây'}
                            </span>
                            {a.cvFileName && (
                              <>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#4f46e5',
                                  fontSize: 12,
                                  background: '#eef2ff',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  fontWeight: 500
                                }}>
                                  <Icon name="paperclip" width={11} height={11} /> {a.cvFileName}
                                </span>
                              </>
                            )}
                          </div>

                          {a.coverLetter && (
                            <div style={{
                              marginTop: 8,
                              fontSize: 12.5,
                              color: '#475569',
                              background: '#f8fafc',
                              padding: '6px 12px',
                              borderRadius: 8,
                              borderLeft: '3px solid #6366f1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              maxWidth: 620
                            }}>
                              <Icon name="chat" width={12} height={12} style={{ color: '#6366f1', flexShrink: 0 }} />
                              <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Thư ứng tuyển: &ldquo;{a.coverLetter}&rdquo;
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right status & actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 14px',
                            borderRadius: 20,
                            fontSize: 12.5,
                            fontWeight: 700,
                            background: statusMeta.bg,
                            color: statusMeta.color,
                            border: `1px solid ${statusMeta.border}`
                          }}>
                            <Icon name={statusMeta.icon} width={13} height={13} />
                            {statusMeta.label}
                          </span>
                        </div>

                        {isCompleted && (() => {
                          const appCompletedDate = a.completedAt
                            || appReview?.jobCompletedAt
                            || (a.updatedAt);
                          const appCountdown = getBonusCountdown(appCompletedDate, now);
                          const isAppWithin3Days = appReview?.canEarnBonusPoints !== undefined
                            ? (appReview.canEarnBonusPoints && (!appCountdown || appCountdown.isWithin3Days))
                            : (appCountdown ? appCountdown.isWithin3Days : false);

                          return (
                            <button
                              className="btn btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 600,
                                borderRadius: 8,
                                background: hasAppReviewed ? '#f0fdf4' : '#fef08a',
                                color: hasAppReviewed ? '#15803d' : '#854d0e',
                                border: `1px solid ${hasAppReviewed ? '#bbf7d0' : '#fde047'}`,
                              }}
                              onClick={() => openModal('review', {
                                jobTitle: a.jobTitle || a.title,
                                withName: a.employerName || a.emp,
                                direction: 'toEmployer',
                                dashJobId: appTargetJobId,
                                jobId: appTargetJobId,
                                completedAt: appCompletedDate,
                                isWithin3Days: isAppWithin3Days,
                                remainingHours: appCountdown?.remainingHours,
                                canEarnBonus: isAppWithin3Days,
                                existingReview: appReview?.myReview,
                                onReviewed: () => {
                                  refreshMyApplications?.();
                                  loadJobReview(appTargetJobId);
                                }
                              })}
                            >
                              <Icon name="star" width={13} height={13} style={{ fill: hasAppReviewed ? '#15803d' : '#eab308', stroke: hasAppReviewed ? '#15803d' : '#eab308' }} />
                              {hasAppReviewed
                                ? `Đã đánh giá (${appReview?.myReview?.stars || 5}⭐)`
                                : isAppWithin3Days
                                  ? 'Đánh giá (+5đ)'
                                  : 'Đánh giá NTD'}
                            </button>
                          );
                        })()}

                        {isHiredOrActive && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setActiveTab('active')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontWeight: 600,
                              borderRadius: 8,
                              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)'
                            }}
                          >
                            <Icon name="briefcase" width={13} height={13} /> {isCompleted ? 'Xem chi tiết bàn giao' : 'Vào làm việc'}
                          </button>
                        )}

                        <button
                          className="btn btn-outline btn-sm"
                          title="Nhắn tin với Nhà tuyển dụng"
                          onClick={() => openChatWithPerson(a.employerName || a.emp, `Chào ${a.employerName || a.emp}, em liên hệ về dự án "${a.jobTitle || a.title}"...`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            borderRadius: 8,
                            color: '#334155'
                          }}
                        >
                          <Icon name="chat" width={13} height={13} style={{ color: 'var(--primary)' }} /> Nhắn tin
                        </button>

                        {a.jobId && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(`/jobs/${a.jobId}`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              borderRadius: 8
                            }}
                          >
                            <Icon name="eye" width={13} height={13} /> Xem việc
                          </button>
                        )}

                        {a.status === 'pending' && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{
                              color: '#ef4444',
                              borderColor: '#fca5a5',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              borderRadius: 8
                            }}
                            onClick={() => handleWithdrawApp(a.jobId || a.id)}
                          >
                            <Icon name="ban" width={12} height={12} /> Rút đơn
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 20 }}>
                  <Pagination
                    currentPage={appsPage}
                    totalPages={appsTotalPages}
                    totalItems={filteredApplications.length}
                    pageSize={appsPageSize}
                    onPageChange={setAppsPage}
                    itemLabel="đơn ứng tuyển"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal xác nhận hủy nhận việc */}
      {cancelModalJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !isCancelling) setCancelModalJob(null); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e11d48', marginBottom: 14 }}>
              <Icon name="alert-triangle" width={22} height={22} />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Xác nhận hủy nhận việc</h3>
            </div>

            <p style={{ fontSize: 14, color: '#334155', margin: '0 0 12px' }}>
              Bạn đang yêu cầu hủy công việc: <b>{cancelModalJob.title}</b>
            </p>

            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 13,
              color: '#9f1239',
              marginBottom: 16,
              lineHeight: 1.5
            }}>
              <b>Lưu ý quan trọng:</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Bạn sẽ <b>bị trừ 10 điểm uy tín (Reliability Score)</b> vì hủy công việc đang trong quá trình thực hiện.</li>
                <li>Công việc sẽ tự động được mở lại để Nhà tuyển dụng lựa chọn ứng viên khác.</li>
                <li>Toàn bộ tiền ký quỹ Escrow sẽ được hoàn trả lại cho NTD.</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Lý do hủy việc (tùy chọn):
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do bạn không thể tiếp tục thực hiện công việc..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={isCancelling}
                onClick={() => setCancelModalJob(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#e11d48', borderColor: '#e11d48', fontWeight: 700 }}
                disabled={isCancelling}
                onClick={handleConfirmCancelJob}
              >
                {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy (Trừ 10đ uy tín)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MỞ KHIẾU NẠI (DISPUTE MODAL) */}
      {disputeModalJob && (
        <DisputeModal
          job={disputeModalJob}
          deliverableId={disputeModalJob.deliverable?.id}
          onClose={() => setDisputeModalJob(null)}
          onSuccess={() => {
            refreshMyApplications?.();
            refreshDisputes?.();
            setDisputeModalJob(null);
          }}
        />
      )}

      {/* MODAL XEM HỒ SƠ TRANH CHẤP & NỘP CHỨNG CỨ 72H */}
      {disputeDetailModalId && (
        <DisputeDetailModal
          disputeId={disputeDetailModalId}
          onClose={() => setDisputeDetailModalId(null)}
          onRefresh={() => {
            refreshMyApplications?.();
            refreshDisputes?.();
          }}
        />
      )}
    </div>
  );
}