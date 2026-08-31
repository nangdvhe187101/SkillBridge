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
