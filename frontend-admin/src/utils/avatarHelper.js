function getCleanStorageBase() {
  const isClientProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (isClientProd) {
    return 'https://api.skillbridge.id.vn';
  }
  // Ở môi trường local, StorageController nằm ở SkillBridge.API (cổng 5004)
  return 'http://localhost:5004';
}

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

  const base = getCleanStorageBase();

  // 2. Nếu chuỗi đã chứa endpoint storage/file (kể cả có domain khác hoặc cổng khác)
  if (s.includes('storage/file')) {
    let key = '';
    if (s.includes('key=')) {
      try {
        const u = new URL(s, 'http://dummy.local');
        key = u.searchParams.get('key') || '';
      } catch {
        key = s.split('key=')[1]?.split('&')[0] || '';
      }
    }
    if (key) {
      key = decodeURIComponent(key).replace(/^[\/\\]+/, '');
      return `${base}/api/storage/file?key=${encodeURIComponent(key)}`;
    }
  }

  // 3. Nếu là URL Cloudflare R2 (.r2.dev), chuyển qua backend storage endpoint
  if (s.includes('.r2.dev/')) {
    const key = s.substring(s.indexOf('.r2.dev/') + 8).split('?')[0].replace(/^[\/\\]+/, '');
    return `${base}/api/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 4. Nếu chứa key avatars/ hoặc covers/
  if (s.includes('avatars/') || s.includes('covers/')) {
    const startIdx = Math.max(s.indexOf('avatars/'), s.indexOf('covers/'));
    const rawKey = s.substring(startIdx).split('?')[0].split('&')[0];
    const key = decodeURIComponent(rawKey).replace(/^[\/\\]+/, '');
    return `${base}/api/storage/file?key=${encodeURIComponent(key)}`;
  }

  // 5. Full URL bên ngoài hợp lệ (Google avatar, CDN công khai, Unsplash...)
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }

  // 6. Nếu là tệp tĩnh trong uploads/
  if (s.includes('/uploads/') || s.startsWith('uploads/')) {
    const cleanUploadsPath = s.substring(s.indexOf('uploads/'));
    return `${base}/${cleanUploadsPath}`;
  }

  // 7. Tệp key thông thường
  const cleanKey = s.replace(/^\/?(?:api\/)+/, '').replace(/^[\/\\]+/, '');
  return `${base}/api/storage/file?key=${encodeURIComponent(cleanKey)}`;
}
