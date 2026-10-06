import { apiFetch } from './authApi';

/**
 * Lấy danh sách trường đại học được SkillBridge hỗ trợ xác minh
 */
export async function getSchools() {
  return apiFetch('/student/verification/schools', { method: 'GET' });
}

/**
 * Lấy trạng thái hồ sơ xác minh thẻ sinh viên của người dùng hiện tại
 */
export async function getStudentVerificationStatus() {
  return apiFetch('/student/verification/status', { method: 'GET' });
}

/**
 * Nộp hồ sơ xác minh thẻ sinh viên
 * @param {Object} data - { schoolId, studentCode, fullNameOnCard, graduationYear, frontCardUrl, frontCardHash, backCardUrl, backCardHash }
 */
export async function submitStudentVerification(data) {
  return apiFetch('/student/verification/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Tải lên ảnh thẻ sinh viên (mặt trước hoặc mặt sau)
 * @param {File} file
 */
export async function uploadStudentCard(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/student/verification/upload-card', {
    method: 'POST',
    body: formData,
  });
}

