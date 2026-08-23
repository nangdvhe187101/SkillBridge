import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";

async function handleResponse(response) {
    let data = null;
    const text = await response.text();
    if (text) {
        try { data = JSON.parse(text); } catch { data = null; }
    }
    if (!response.ok) {
        if (response.status === 429) {
            const err = new Error("Bạn đã thao tác quá nhiều lần, vui lòng thử lại sau ít phút.");
            err.status = 429;
            throw err;
        }
        const fallback = `Lỗi ${response.status}: không thể kết nối tới máy chủ hoặc endpoint không tồn tại.`;
        const err = new Error(data?.message || fallback);
        err.status = response.status;
        err.data = data;
        err.isGraceWindow = !!data?.isGraceWindow;
        throw err;
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

let refreshPromise = null;
export async function refreshToken() {
    if (refreshPromise) {
        return refreshPromise;
    }
    refreshPromise = (async () => {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        return handleResponse(res);
    })().finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
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

export async function changePassword(currentPassword, newPassword) {
    return apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

export async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const defaultHeaders = isFormData ? {} : { "Content-Type": "application/json" };

    const doFetch = (accessToken) =>
        fetch(`${API_URL}${path}`, {
            ...options,
            credentials: "include",
            headers: {
                ...defaultHeaders,
                ...(options.headers || {}),
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
        });

    let res = await doFetch(getAccessToken());

    if (res.status === 401) {
        try {
            const result = await refreshToken();
            setAccessToken(result.token);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('auth:token_refreshed', { detail: { token: result.token } }));
            }
            res = await doFetch(result.token);
        } catch (err) {
            if (err?.isGraceWindow) {
                // Grace window: Một request/tab khác vừa làm mới token trong vòng 30s.
                // Đợi ngắn để token mới được đồng bộ và thử gọi lại trước khi logout
                await new Promise((resolve) => setTimeout(resolve, 400));
                const currentToken = getAccessToken();
                if (currentToken) {
                    res = await doFetch(currentToken);
                    if (res.ok) {
                        return handleResponse(res);
                    }
                }
            }
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