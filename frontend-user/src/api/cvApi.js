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

export async function updateCv(id, data) {
    return apiFetch(`/cv-files/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// Nhà tuyển dụng xem các CV sinh viên đã cho phép tìm kiếm
export async function getStudentCvFiles(studentId) {
    return apiFetch(`/cv-files/student/${studentId}`, { method: 'GET' });
}
