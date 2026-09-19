import { apiFetch } from './authApi';

/**
 * Lấy danh sách cuộc trò chuyện theo phân loại Tab ('chat' | 'request')
 * @param {string} [tab='chat']
 */
export async function getConversations(tab = 'chat') {
  const query = new URLSearchParams({ tab: tab || 'chat' }).toString();
  return apiFetch(`/conversations?${query}`, {
    method: 'GET',
  });
}

/**
 * Lấy lịch sử tin nhắn của một cuộc trò chuyện kèm phân trang
 * @param {number|string} conversationId
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=30]
 */
export async function getConversationMessages(conversationId, { page = 1, pageSize = 30 } = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
  return apiFetch(`/conversations/${conversationId}/messages?${query}`, {
    method: 'GET',
  });
}

/**
 * Bắt đầu hoặc lấy cuộc trò chuyện với người dùng khác
 * @param {number} targetUserId
 * @param {number|null} [jobId=null]
 */
export async function startConversation(targetUserId, jobId = null) {
  return apiFetch('/conversations/start', {
    method: 'POST',
    body: JSON.stringify({
      targetUserId: Number(targetUserId),
      jobId: jobId ? Number(jobId) : null,
    }),
  });
}

/**
 * Gửi tin nhắn mới vào cuộc trò chuyện
 * @param {number|string} conversationId
 * @param {object} payload
 * @param {string} [payload.messageText]
 * @param {string} [payload.attachmentUrl]
 * @param {string} [payload.attachmentType]
 */
export async function sendMessage(conversationId, { messageText, attachmentUrl, attachmentType } = {}) {
  return apiFetch(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      messageText: messageText || null,
      attachmentUrl: attachmentUrl || null,
      attachmentType: attachmentType || null,
    }),
  });
}

/**
 * Đánh dấu đã đọc tất cả tin nhắn trong cuộc trò chuyện
 * @param {number|string} conversationId
 */
export async function markConversationAsRead(conversationId) {
  return apiFetch(`/conversations/${conversationId}/read`, {
    method: 'PATCH',
  });
}

/**
 * Tải lên tệp tin đính kèm (ảnh, video, âm thanh, tài liệu) cho cuộc trò chuyện
 * @param {number|string} conversationId
 * @param {File|Blob} file
 */
export async function uploadAttachment(conversationId, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/conversations/${conversationId}/attachments`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Lưu trữ hoặc bỏ lưu trữ cuộc hội thoại
 * @param {number|string} conversationId
 * @param {boolean} [archive=true]
 */
export async function toggleArchiveConversation(conversationId, archive = true) {
  return apiFetch(`/conversations/${conversationId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ archive }),
  });
}

/**
 * Chấp nhận yêu cầu nhắn tin (Chuyển từ Tab Yêu cầu sang Tab Trò chuyện)
 * @param {number|string} conversationId
 */
export async function acceptMessageRequest(conversationId) {
  return apiFetch(`/conversations/${conversationId}/accept-request`, {
    method: 'POST',
  });
}

/**
 * Từ chối yêu cầu nhắn tin (Xóa khỏi danh sách chờ)
 * @param {number|string} conversationId
 */
export async function declineMessageRequest(conversationId) {
  return apiFetch(`/conversations/${conversationId}/decline-request`, {
    method: 'POST',
  });
}
