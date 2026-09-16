import { apiFetch } from './authApi';

export async function getMyCvFiles() {
    return apiFetch('/cv-files', { method: 'GET' });
}

export async function uploadCv(data) {
    return apiFetch('/cv-files', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function uploadCvFile(formData) {
    return apiFetch('/cv-files/upload', {
        method: 'POST',
        body: formData,
    });
}

export async function deleteCv(id) {
    return apiFetch(`/cv-files/${id}`, { method: 'DELETE' });
}
