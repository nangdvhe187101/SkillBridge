import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const API_URL = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || "http://localhost:5004/api";

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

        let errorMessage = data?.message;
        if (!errorMessage && data?.errors && typeof data.errors === 'object') {
            const msgs = [];
            for (const key of Object.keys(data.errors)) {
                const val = data.errors[key];
                if (Array.isArray(val)) {
                    msgs.push(...val);
                } else if (typeof val === 'string') {
                    msgs.push(val);
                }
            }
            if (msgs.length > 0) {
                errorMessage = msgs.join('. ');
            }
        }
        if (!errorMessage && data?.title) {
            errorMessage = data.title;
        }

        const fallback = `Lỗi ${response.status}: không thể hoàn tất thao tác. Vui lòng thử lại.`;
        const err = new Error(errorMessage || fallback);
        err.status = response.status;
        err.data = data;
        err.isGraceWindow = !!data?.isGraceWindow;
        throw err;
    }
    return data;
}

export async function register(fullNameOrData, email, password, phoneNumber, roleCode) {
    let payload;
    if (typeof fullNameOrData === 'object' && fullNameOrData !== null) {
        payload = {
            fullName: fullNameOrData.fullName || fullNameOrData.name || '',
            email: fullNameOrData.email || '',
            password: fullNameOrData.password || '',
            phoneNumber: fullNameOrData.phoneNumber || fullNameOrData.phone || null,
            roleCode: fullNameOrData.roleCode || fullNameOrData.role || 'student',
        };
    } else {
        payload = {
            fullName: fullNameOrData || '',
            email: email || '',
            password: password || '',
            phoneNumber: phoneNumber || null,
            roleCode: roleCode || 'student',
        };
    }

    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
            headers: { "X-Requested-With": "XMLHttpRequest" },
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
                ...options.headers,
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
        });

    let res = await doFetch(getAccessToken());

    if (res.status === 401) {
        let refreshSuccess = false;

        for (let attempt = 0; attempt <= 3; attempt++) {
            try {
                const result = await refreshToken();
                setAccessToken(result.token);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('auth:token_refreshed', { detail: { token: result.token } }));
                }
                res = await doFetch(result.token);
                refreshSuccess = true;
                break;
            } catch (err) {
                if (err?.isGraceWindow && attempt < 3) {
                    // Grace window: Tab/request khác vừa refresh token trong 30s.
                    // Backoff: 400ms, 800ms, 1600ms (+ jitter)
                    const delay = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                    // Kiểm tra nếu token đã được đồng bộ từ broadcast/event
                    const currentToken = getAccessToken();
                    if (currentToken) {
                        res = await doFetch(currentToken);
                        if (res.ok) {
                            refreshSuccess = true;
                            break;
                        }
                    }
                    continue;
                }
                break;
            }
        }

        if (!refreshSuccess) {
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
            headers: { "X-Requested-With": "XMLHttpRequest" },
            credentials: "include",
        });
    } catch {
    }
}