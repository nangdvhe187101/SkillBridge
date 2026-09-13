import { apiFetch } from './authApi';

export async function getNotifications(page = 1, pageSize = 20) {
  return apiFetch(`/notifications?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });
}

export async function markNotificationAsRead(id) {
  return apiFetch(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead() {
  return apiFetch('/notifications/read-all', {
    method: 'POST',
  });
}
