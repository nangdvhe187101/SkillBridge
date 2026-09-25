import { apiFetch } from './authApi';

/**
 * Lấy trạng thái xác minh danh tính eKYC của người dùng hiện tại
 */
export async function getKycStatus() {
    return apiFetch('/users/kyc/status', { method: 'GET' });
}

/**
 * Gửi hồ sơ xác minh danh tính (Thẻ sinh viên / Giấy phép kinh doanh)
 * @param {FormData} formData
 */
export async function submitKyc(formData) {
    return apiFetch('/users/kyc/submit', {
        method: 'POST',
        body: formData,
    });
}
