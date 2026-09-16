import { apiFetch } from './authApi';

export async function getUserProfile() {
    return apiFetch('/users/profile', { method: 'GET' });
}

export async function updateUserProfile(data) {
    return apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('file', file);

    return apiFetch('/users/avatar', {
        method: 'POST',
        body: formData,
    });
}
