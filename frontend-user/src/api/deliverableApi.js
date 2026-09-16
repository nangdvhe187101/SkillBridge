import { apiFetch } from './authApi';

export async function getJobDeliverables(jobId) {
    return apiFetch(`/jobs/${jobId}/deliverables`, { method: 'GET' });
}

export async function submitJobDeliverable(jobId, formData) {
    return apiFetch(`/jobs/${jobId}/deliverables`, {
        method: 'POST',
        body: formData,
    });
}

export async function reviewJobDeliverable(jobId, deliverableId, reviewData) {
    return apiFetch(`/jobs/${jobId}/deliverables/${deliverableId}/review`, {
        method: 'POST',
        body: JSON.stringify(reviewData),
    });
}
