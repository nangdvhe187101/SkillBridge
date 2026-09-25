import { apiFetch } from './authApi';

export async function submitReport(data) {
    return apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}
