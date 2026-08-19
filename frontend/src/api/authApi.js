import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const API_URL = "http://localhost:5004/api";

async function handleResponse(response) {
    let data = null;
    const text = await response.text();
    if (text) {
        try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!response.ok) {
        if (response.status === 429) {
            throw new Error("Bạn đã thao tác quá nhiều lần, vui lòng thử lại sau ít phút.");
        }
        const fallback = `Lỗi ${response.status}: không thể kết nối tới máy chủ hoặc endpoint không tồn tại.`;
        throw new Error(data?.message || fallback);
    }
    return data;
}

export async function register(fullName, email, password, phoneNumber, roleCode) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, phoneNumber, roleCode }),
    });
    return handleResponse(res);
}

export async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
}

export async function verifyEmail(token) {
    const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });
    return handleResponse(res);
}

export async function resendVerification(email) {
    const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    return handleResponse(res);
}

export async function refreshToken() {
    const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
    });
    return handleResponse(res);
}

export async function requestPasswordResetOtp(email) {
    const res = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    return handleResponse(res);
}

export async function verifyPasswordResetOtp(email, otp) {
    const res = await fetch(`${API_URL}/auth/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    });
    return handleResponse(res);
}

export async function resetPassword(resetToken, newPassword) {
    const res = await fetch(`${API_URL}/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
    });
    return handleResponse(res);
}

let refreshPromise = null;
export async function apiFetch(path, options = {}) {
    const doFetch = (accessToken) =>
        fetch(`${API_URL}${path}`, {
            ...options,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {}),
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
        });

    let res = await doFetch(getAccessToken());

    if (res.status === 401) {
        try {
            if (!refreshPromise) {
                refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
            }
            const result = await refreshPromise;
            setAccessToken(result.token);
            res = await doFetch(result.token);
        } catch (err) {
            handleAuthExpired();
            throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        }
    }

    return handleResponse(res);
}

function handleAuthExpired() {
    clearAccessToken();
    localStorage.removeItem('user');
    if (window.location.pathname !== '/auth') {
        window.location.href = '/auth?tab=login';
    }
}

export async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch {
    }
}