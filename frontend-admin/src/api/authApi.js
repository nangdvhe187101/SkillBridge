import { getAccessToken, setAccessToken, clearAccessToken } from "./tokenStore";

const API_URL = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || "http://localhost:5005/api";

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
        throw err;
    }
    return data;
}

export async function adminLogin(email, password) {
    const res = await fetch(`${API_URL}/admin-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
}

export async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const defaultHeaders = isFormData ? {} : { "Content-Type": "application/json" };

    const accessToken = getAccessToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
    });

    if (res.status === 401) {
        handleAuthExpired();
        throw new Error("Phiên đăng nhập quản trị đã hết hạn, vui lòng đăng nhập lại.");
    }

    return handleResponse(res);
}

function handleAuthExpired() {
    clearAccessToken();
    localStorage.removeItem('admin_user');
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

export function adminLogout() {
    clearAccessToken();
    localStorage.removeItem('admin_user');
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
}
