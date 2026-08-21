let accessToken = typeof window !== 'undefined' ? localStorage.getItem('token') || null : null;

export function getAccessToken() {
    return accessToken;
}

export function setAccessToken(token) {
    accessToken = token;
    if (typeof window !== 'undefined') {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }
}

export function clearAccessToken() {
    accessToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
}