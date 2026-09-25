import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tự động đưa màn hình về đỉnh đầu trang (Top of Page) mỗi khi chuyển route hoặc chức năng.
 * Khắc phục hiện tượng giữ nguyên vị trí cuộn cũ của Single Page Application (SPA).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Đưa cửa sổ trình duyệt về đầu trang ngay lập tức
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });

    // 2. Dự phòng cho các trình duyệt hoặc mobile webview có scroll trên documentElement / body / container
    try {
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
      const pageEl = document.querySelector('.page');
      if (pageEl) {
        pageEl.scrollTop = 0;
      }
    } catch {
      // Ignore if DOM elements are not accessible
    }
  }, [pathname]);

  return null;
}
