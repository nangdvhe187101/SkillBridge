// ⚠️ Access token chỉ lưu trong memory (không localStorage) để tránh XSS đọc được.
// Khi reload trang, StoreContext sẽ gọi /api/auth/refresh để lấy token mới từ HttpOnly cookie.
let accessToken = null;

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token;
}

export function clearAccessToken() {
    accessToken = null;
}