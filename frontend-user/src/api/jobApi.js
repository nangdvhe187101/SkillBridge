import { apiFetch } from './authApi';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";

export async function getCategories() {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error("Không thể tải danh sách danh mục");
    return res.json();
}

export async function getJobs(params = {}) {
    const query = new URLSearchParams();
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.location) query.append('location', params.location);
    if (params.minBudget) query.append('minBudget', params.minBudget);
    if (params.maxBudget) query.append('maxBudget', params.maxBudget);
    if (params.isUrgent !== undefined && params.isUrgent !== null) query.append('isUrgent', params.isUrgent);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.pageSize) query.append('pageSize', params.pageSize);
    if (params.sort) query.append('sort', params.sort);

    const queryString = query.toString();
    const url = queryString ? `/jobs?${queryString}` : '/jobs';

    // apiFetch automatically attaches accessToken if available (for IsSaved)
    return apiFetch(url, { method: 'GET' });
}

export async function getJobById(id) {
    return apiFetch(`/jobs/${id}`, { method: 'GET' });
}

export async function createJob(jobData) {
    return apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
    });
}

export async function updateJob(id, jobData) {
    return apiFetch(`/jobs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(jobData),
    });
}

export async function cancelJob(id) {
    return apiFetch(`/jobs/${id}/cancel`, {
        method: 'PATCH',
    });
}

export async function reopenJob(id) {
    return apiFetch(`/jobs/${id}/reopen`, {
        method: 'PATCH',
    });
}

export async function deleteJob(id) {
    return apiFetch(`/jobs/${id}`, {
        method: 'DELETE',
    });
}

export async function getMyJobs(status = null, page = 1, pageSize = 20) {
    const query = new URLSearchParams({ page, pageSize });
    if (status) query.append('status', status);
    return apiFetch(`/jobs/mine?${query.toString()}`, { method: 'GET' });
}

export async function saveJob(id) {
    return apiFetch(`/jobs/${id}/save`, { method: 'POST' });
}

export async function unsaveJob(id) {
    return apiFetch(`/jobs/${id}/save`, { method: 'DELETE' });
}

export async function getSavedJobs(page = 1, pageSize = 20) {
    return apiFetch(`/jobs/saved?page=${page}&pageSize=${pageSize}`, { method: 'GET' });
}

export async function getSavedJobIds() {
    return apiFetch('/jobs/saved-ids', { method: 'GET' });
}

export async function uploadJobAttachment(jobId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(`/jobs/${jobId}/attachments`, {
        method: 'POST',
        body: formData,
    });
}

export async function deleteJobAttachment(jobId, attachmentId) {
    return apiFetch(`/jobs/${jobId}/attachments/${attachmentId}`, {
        method: 'DELETE',
    });
}

export async function extendDeadline(jobId, newDeadlineAt, reason = '') {
    return apiFetch(`/jobs/${jobId}/extend-deadline`, {
        method: 'PATCH',
        body: JSON.stringify({ newDeadlineAt, reason }),
    });
}

const EXTENSION_STORAGE_PREFIX = 'sb_deadline_ext_';

/**
 * Sinh viên gửi đề xuất xin gia hạn deadline
 */
export async function requestDeadlineExtension(jobId, { additionalDays, reason, currentDeadline }) {
    const baseDate = currentDeadline ? new Date(currentDeadline) : new Date();
    const newDeadline = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    const reqData = {
        jobId: Number(jobId),
        additionalDays,
        reason,
        requestedAt: new Date().toISOString(),
        currentDeadline: baseDate.toISOString(),
        proposedDeadline: newDeadline.toISOString(),
        status: 'pending' // 'pending' | 'accepted' | 'rejected'
    };
    try {
        localStorage.setItem(`${EXTENSION_STORAGE_PREFIX}${jobId}`, JSON.stringify(reqData));
    } catch {}
    return reqData;
}

/**
 * Lấy thông tin yêu cầu gia hạn đang chờ của job
 */
export function getDeadlineExtensionRequest(jobId) {
    try {
        const item = localStorage.getItem(`${EXTENSION_STORAGE_PREFIX}${jobId}`);
        return item ? JSON.parse(item) : null;
    } catch {
        return null;
    }
}

/**
 * NTD phê duyệt hoặc từ chối yêu cầu gia hạn
 */
export async function respondDeadlineExtension(jobId, { accepted, rejectionReason = '' }) {
    const currentReq = getDeadlineExtensionRequest(jobId);
    if (!currentReq) return null;

    if (accepted) {
        // Gọi API backend thật để cập nhật deadline cho Job
        await extendDeadline(jobId, currentReq.proposedDeadline, currentReq.reason);
        currentReq.status = 'accepted';
        currentReq.acceptedAt = new Date().toISOString();
    } else {
        currentReq.status = 'rejected';
        currentReq.rejectionReason = rejectionReason || 'Nhà tuyển dụng không đồng ý gia hạn';
        currentReq.rejectedAt = new Date().toISOString();
    }

    try {
        localStorage.setItem(`${EXTENSION_STORAGE_PREFIX}${jobId}`, JSON.stringify(currentReq));
    } catch {}
    return currentReq;
}

