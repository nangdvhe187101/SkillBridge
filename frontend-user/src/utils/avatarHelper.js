const API_URL = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || 'http://localhost:5004/api';
const API_BASE = API_URL.replace(/\/api\/?$/, '');

/**
 * Chuẩn hóa mọi dạng avatar/media URL hoặc file key thành URL ảnh hợp lệ có thể load trực tiếp trên browser
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

  // 2. Nếu là URL Cloudflare R2 (.r2.dev), chuyển qua backend storage endpoint để tránh lỗi 401 Unauthorized
  if (s.includes('.r2.dev/')) {
    const key = s.substring(s.indexOf('.r2.dev/') + 8).split('?')[0];
    return `${API_BASE}/api/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 3. Nếu trong database lưu URL localhost nhưng client đang truy cập production (ví dụ: skillbridge.id.vn)
  if (s.startsWith('http://localhost') || s.startsWith('http://127.0.0.1')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const u = new URL(s);
        return `${API_BASE}${u.pathname}${u.search}`;
      } catch {
        return s;
      }
    }
    return s;
  }

  // 4. Full URL bên ngoài hợp lệ (Google avatar, CDN công khai, Unsplash...)
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }

  // 5. Đã là endpoint /api/storage/file hoặc /uploads/
  if (s.includes('/api/storage/file') || s.startsWith('/uploads/')) {
    return `${API_BASE}${s.startsWith('/') ? '' : '/'}${s}`;
  }

  // 6. Chứa key avatars/ hoặc covers/
  if (s.includes('avatars/') || s.includes('covers/')) {
    const key = s.substring(Math.max(s.indexOf('avatars/'), s.indexOf('covers/'))).split('?')[0];
    return `${API_BASE}/api/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 7. Tệp key thông thường
  const cleanKey = s.replace(/^[\/\\]+/, '');
  return `${API_BASE}/api/storage/file?key=${encodeURIComponent(cleanKey)}`;
}
