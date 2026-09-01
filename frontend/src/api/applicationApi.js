import { apiFetch } from './authApi';

export async function applyJob(jobId, cvFileId, coverLetter = '') {
    return apiFetch(`/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ jobId, cvFileId, coverLetter }),
    });
}

export async function getJobApplicants(jobId, page = 1, pageSize = 20) {
    return apiFetch(`/jobs/${jobId}/applications?page=${page}&pageSize=${pageSize}`, { method: 'GET' });
}

export async function getMyApplications(page = 1, pageSize = 50) {
    return apiFetch(`/applications/my?page=${page}&pageSize=${pageSize}`, { method: 'GET' });
}
