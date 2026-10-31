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

/**
 * Chuẩn hóa URL/key ảnh thẻ sinh viên (identity_documents) thành URL ảnh có thể
 * load trực tiếp trên <img src>. Khác với ảnh công khai (avatar, cover), file này
 * đi qua kiểm tra quyền SEC-02 ở StorageController nên bắt buộc phải kèm JWT - mà
 * <img src="..."> không gửi được header Authorization, nên gắn token qua query
 * string ?access_token=, được JwtBearerEvents.OnMessageReceived chấp nhận riêng
 * cho đúng path /api/storage/file (xem Program.cs).
 * @param {string|null|undefined} url
 * @returns {string} URL rỗng nếu không có input hợp lệ
 */
export function getCardImageUrl(url) {
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
