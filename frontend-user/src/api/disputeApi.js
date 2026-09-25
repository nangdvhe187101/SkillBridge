import { apiFetch } from './authApi';

/**
 * Mở khiếu nại tranh chấp cho công việc
 * @param {FormData} formData (jobId, reason, origin, deliverableId, files, fileDescriptions)
 */
export async function createDispute(formData) {
    return apiFetch('/disputes', {
        method: 'POST',
        body: formData,
    });
}

/**
 * Nộp bổ sung bằng chứng trong thời hạn 72 giờ
 * @param {number} disputeId
 * @param {FormData} formData (file, description)
 */
export async function addDisputeEvidence(disputeId, formData) {
    return apiFetch(`/disputes/${disputeId}/evidences`, {
        method: 'POST',
        body: formData,
    });
}

/**
 * Lấy danh sách các khiếu nại của người dùng hiện tại
 */
export async function getMyDisputes() {
    return apiFetch('/disputes/my', { method: 'GET' });
}

/**
 * Lấy chi tiết hồ sơ khiếu nại và danh sách bằng chứng
 * @param {number} disputeId
 */
export async function getDisputeDetail(disputeId) {
    return apiFetch(`/disputes/${disputeId}`, { method: 'GET' });
}
