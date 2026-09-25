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

export async function getPublicStudentProfile(studentId) {
    return apiFetch(`/users/${studentId}/public-profile`, { method: 'GET' });
}

export async function getMyPortfolio() {
    return apiFetch('/users/portfolio', { method: 'GET' });
}

export async function uploadPortfolioItem(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/users/portfolio', {
        method: 'POST',
        body: formData,
    });
}

export async function deletePortfolioItem(id) {
    return apiFetch(`/users/portfolio/${id}`, {
        method: 'DELETE',
    });
}

export async function getMyBadges() {
    return apiFetch('/users/badges', { method: 'GET' });
}

