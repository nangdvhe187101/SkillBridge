const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5004/api';
const API_BASE = API_URL.replace(/\/api\/?$/, '');

/**
 * Chuẩn hóa mọi dạng avatar URL/key thành URL ảnh hợp lệ có thể load trực tiếp trên browser
 * @param {string|null|undefined} src
 * @returns {string|null}
 */
export function resolveAvatarUrl(src) {
  if (!src || typeof src !== 'string') return null;
  const s = src.trim();
  if (!s || s.length <= 2 || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
  const lower = s.toLowerCase();
  if (lower === 'file' || lower === 'avatar' || lower === 'default' || lower === 'image') return null;
  // Nếu là chuỗi đơn không có dấu / hoặc đuôi mở rộng hợp lệ thì không phải file key
  if (!s.includes('/') && !s.includes('.')) return null;


  // 1. Data URI hoặc Blob URL (upload preview)
  if (s.startsWith('data:') || s.startsWith('blob:')) {
    return s;
  }

  // 2. Đã là endpoint /api/storage/file (tránh double-wrap)
  if (s.includes('/api/storage/file')) {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      return s;
    }
    return `${API_BASE}${s.startsWith('/') ? '' : '/'}${s}`;
  }

  // 3. Chứa key avatars/ (dù là full URL r2.dev, cloudflarestorage hay relative key)
  if (s.includes('avatars/')) {
    const key = s.substring(s.indexOf('avatars/')).split('?')[0];
    return `${API_URL}/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 4. URL r2.dev bất kỳ
  if (s.includes('.r2.dev/')) {
    const key = s.substring(s.indexOf('.r2.dev/') + 8).split('?')[0];
    return `${API_URL}/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 5. Full URL http/https hợp lệ bên ngoài (Google avatar, CDN khác)
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }

  // 6. Tệp key thông thường
  return `${API_URL}/storage/file?key=${encodeURIComponent(s)}`;
}
