import { apiFetch } from './authApi';

export async function applyJob(jobId, cvFileId, coverLetter = '') {
    return apiFetch(`/jobs/${jobId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ jobId, cvFileId, coverLetter }),
    });
}

export async function getJobApplicants(jobId) {
    return apiFetch(`/jobs/${jobId}/applications`, { method: 'GET' });
}

export async function getMyApplications() {
    return apiFetch('/applications/my', { method: 'GET' });
}
