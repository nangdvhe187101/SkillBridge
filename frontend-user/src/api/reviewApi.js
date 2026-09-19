import { apiFetch } from './authApi';

/**
 * Gửi đánh giá cho công việc đã hoàn thành
 * @param {Object} data { jobId: number, stars: number, comment?: string }
 */
export async function createReview(data) {
  return apiFetch('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Lấy tóm tắt đánh giá của công việc (gồm myReview, hasReviewed, reviews[])
 * @param {number} jobId
 */
export async function getJobReviews(jobId) {
  return apiFetch(`/reviews/job/${jobId}`, {
    method: 'GET',
  });
}

/**
 * Lấy danh sách đánh giá nhận được của một người dùng
 * @param {number} userId
 */
export async function getUserReviews(userId) {
  return apiFetch(`/reviews/user/${userId}`, {
    method: 'GET',
  });
}
