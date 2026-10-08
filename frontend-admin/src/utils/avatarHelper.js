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
  if (!s.includes('/') && !s.includes('.')) return null;

  // 1. Data URI hoặc Blob URL
  if (s.startsWith('data:') || s.startsWith('blob:')) {
    return s;
  }

  // 2. Nếu là URL Cloudflare R2 (.r2.dev), chuyển qua backend storage endpoint
  if (s.includes('.r2.dev/')) {
    const key = s.substring(s.indexOf('.r2.dev/') + 8).split('?')[0];
    return `/api/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 3. Full URL bên ngoài hợp lệ (Google avatar, CDN công khai, Unsplash...)
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }

  // 4. Đã là endpoint /api/storage/file
  if (s.includes('/api/storage/file')) {
    return s.startsWith('/') ? s : `/${s}`;
  }

  // 5. Chứa key avatars/
  if (s.includes('avatars/')) {
    const key = s.substring(s.indexOf('avatars/')).split('?')[0];
    return `/api/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 6. Tệp key thông thường
  return `/api/storage/file?key=${encodeURIComponent(s.replace(/^[\/\\]+/, ''))}`;
}
