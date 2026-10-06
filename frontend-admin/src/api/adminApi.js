import { apiFetch } from './authApi';

// System Settings APIs
export async function getSystemSettings() {
  return apiFetch('/admin/settings', { method: 'GET' });
}

export async function updateSystemSettings(settings) {
  return apiFetch('/admin/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function triggerAutoAcceptScan() {
  return apiFetch('/admin/trigger/auto-accept-scan', { method: 'POST' });
}

export async function triggerPaymentReconciliation() {
  return apiFetch('/admin/trigger/reconcile-payments', { method: 'POST' });
}

// Bank Verification APIs
export async function getAdminBankVerifications(status = 'pending', page = 1, pageSize = 20) {
  return apiFetch(`/admin/bank-verification?status=${status}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });
}

export async function getAdminBankVerificationDetail(requestId) {
  return apiFetch(`/admin/bank-verification/${requestId}`, {
    method: 'GET',
  });
}

export async function approveBankVerification(requestId, bankReturnedName) {
  return apiFetch(`/admin/bank-verification/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ bankReturnedName }),
  });
}

export async function rejectBankVerification(requestId, rejectionReason) {
  return apiFetch(`/admin/bank-verification/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  });
}

// Withdrawal Management APIs
export async function getAdminWithdrawals(status = 'pending', page = 1, pageSize = 20) {
  return apiFetch(`/admin/withdrawals?status=${status}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
  });
}

export async function approveWithdrawal(id, note = '') {
  return apiFetch(`/admin/withdrawals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function rejectWithdrawal(id, reason = '') {
  return apiFetch(`/admin/withdrawals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Subscription Plans Management APIs
export async function getAdminSubscriptionPlans() {
  return apiFetch('/admin/subscription-plans', { method: 'GET' });
}

export async function updateAdminSubscriptionPlan(id, planData) {
  return apiFetch(`/admin/subscription-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(planData),
  });
}

export async function toggleAdminSubscriptionPlan(id) {
  return apiFetch(`/admin/subscription-plans/${id}/toggle`, {
    method: 'POST',
  });
}

// Dispute Management APIs
export async function getAdminDisputes(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/admin/disputes${query}`, { method: 'GET' });
}

export async function getDisputeChatEvidence(disputeId) {
  return apiFetch(`/admin/disputes/${disputeId}/chat-evidence`, { method: 'GET' });
}

export async function resolveDispute(disputeId, payload) {
  return apiFetch(`/admin/disputes/${disputeId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// User Management APIs
export async function getAdminUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('pageSize', params.pageSize);
  if (params.query) query.append('query', params.query);
  if (params.role && params.role !== 'all') query.append('role', params.role);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.subTab && params.subTab !== 'all') query.append('subTab', params.subTab);

  const qs = query.toString();
  return apiFetch(`/admin/users${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getAdminUserStats() {
  return apiFetch('/admin/users/stats', { method: 'GET' });
}

export async function getAdminUserDetail(userId) {
  return apiFetch(`/admin/users/${userId}`, { method: 'GET' });
}

export async function toggleLockUser(userId, reason = '') {
  return apiFetch(`/admin/users/${userId}/lock`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function blacklistUser(userId, reason) {
  return apiFetch(`/admin/users/${userId}/blacklist`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function removeFromBlacklist(userId) {
  return apiFetch(`/admin/users/${userId}/unblacklist`, {
    method: 'POST',
  });
}

export async function adjustUserReliability(userId, value, note) {
  return apiFetch(`/admin/users/${userId}/reliability`, {
    method: 'POST',
    body: JSON.stringify({ value: Number(value), note }),
  });
}

export async function verifyUserKyc(userId) {
  return apiFetch(`/admin/users/${userId}/verify-kyc`, {
    method: 'POST',
  });
}

// Student Verification APIs
export async function getPendingStudentVerifications() {
  return apiFetch('/admin/student-verifications/pending', { method: 'GET' });
}

export async function reviewStudentVerification(id, dto) {
  return apiFetch(`/admin/student-verifications/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// Content Moderation & Category APIs
export async function getAdminModerationQueue(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('pageSize', params.pageSize);
  if (params.query) query.append('query', params.query);
  if (params.risk && params.risk !== 'all') query.append('risk', params.risk);
  if (params.status && params.status !== 'all') query.append('status', params.status);

  const qs = query.toString();
  return apiFetch(`/admin/content/moderation${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getAdminContentStats() {
  return apiFetch('/admin/content/stats', { method: 'GET' });
}

export async function approveAdminJob(jobId, note = '') {
  return apiFetch(`/admin/content/jobs/${jobId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function rejectAdminJob(jobId, reason) {
  return apiFetch(`/admin/content/jobs/${jobId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function warnAdminJobPoster(jobId, warningMessage) {
  return apiFetch(`/admin/content/jobs/${jobId}/warn`, {
    method: 'POST',
    body: JSON.stringify({ warningMessage }),
  });
}

export async function getAdminCategories() {
  return apiFetch('/admin/content/categories', { method: 'GET' });
}

export async function createAdminCategory(categoryData) {
  return apiFetch('/admin/content/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
}

export async function deleteAdminCategory(categoryId) {
  return apiFetch(`/admin/content/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export async function getAdminFeaturedRequests() {
  return apiFetch('/admin/content/featured', { method: 'GET' });
}

export async function approveAdminFeatured(featuredRequestId) {
  return apiFetch(`/admin/content/featured/${featuredRequestId}/approve`, {
    method: 'POST',
  });
}

export async function getAdminConversations(params = {}) {
  const query = new URLSearchParams();
  if (params.searchTerm) query.append('searchTerm', params.searchTerm);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('pageSize', params.pageSize);

  const qs = query.toString();
  return apiFetch(`/admin/messages/conversations${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getAdminConversationDetail(conversationId) {
  return apiFetch(`/admin/messages/conversations/${conversationId}`, { method: 'GET' });
}

export async function warnAdminConversation(conversationId, reason) {
  return apiFetch(`/admin/messages/conversations/${conversationId}/warn`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function lockAdminConversation(conversationId, reason) {
  return apiFetch(`/admin/messages/conversations/${conversationId}/lock`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function sendAdminBroadcast(title, content, targetRole = 'all') {
  return apiFetch('/admin/messages/broadcast', {
    method: 'POST',
    body: JSON.stringify({ title, content, targetRole }),
  });
}

export async function getAdminTickets(params = {}) {
  const query = new URLSearchParams();
  if (params.searchTerm) query.append('searchTerm', params.searchTerm);
  if (params.status && params.status !== 'all') query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('pageSize', params.pageSize);

  const qs = query.toString();
  return apiFetch(`/admin/tickets${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getAdminTicketDetail(ticketId) {
  return apiFetch(`/admin/tickets/${ticketId}`, { method: 'GET' });
}

export async function replyAdminTicket(ticketId, data) {
  return apiFetch(`/admin/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAdminAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.searchTerm) query.append('searchTerm', params.searchTerm);
  if (params.actorId) query.append('actorId', params.actorId);
  if (params.fromDate) query.append('fromDate', params.fromDate);
  if (params.toDate) query.append('toDate', params.toDate);
  if (params.page) query.append('page', params.page);
  if (params.pageSize) query.append('pageSize', params.pageSize);

  const qs = query.toString();
  return apiFetch(`/admin/audit-logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

export async function getAdminTeamMembers() {
  return apiFetch('/admin/roles/team', { method: 'GET' });
}

export async function addAdminTeamMember(data) {
  return apiFetch('/admin/roles/team', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAdminTeamMember(memberId, data) {
  return apiFetch(`/admin/roles/team/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminTeamMember(memberId) {
  return apiFetch(`/admin/roles/team/${memberId}`, {
    method: 'DELETE',
  });
}

export async function getAdminRolesList() {
  return apiFetch('/admin/roles/roles', { method: 'GET' });
}

export async function getAdminPermissionMatrix() {
  return apiFetch('/admin/roles/matrix', { method: 'GET' });
}

export async function addAdminPermissionRoute(data) {
  return apiFetch('/admin/roles/matrix', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function toggleAdminRolePermission(data) {
  return apiFetch('/admin/roles/matrix/toggle', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminPermissionRoute(permissionId) {
  return apiFetch(`/admin/roles/matrix/${permissionId}`, {
    method: 'DELETE',
  });
}
// Live Contracts & Escrow Monitor APIs
export async function getAdminContractStats() {
  return apiFetch('/admin/contracts/stats', { method: 'GET' });
}

export async function getAdminContracts({ search = '', status = '', page = 1, pageSize = 10 } = {}) {
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  query.set('page', page);
  query.set('pageSize', pageSize);

  return apiFetch(`/admin/contracts?${query.toString()}`, { method: 'GET' });
}

export async function getAdminContractDetail(contractId) {
  return apiFetch(`/admin/contracts/${contractId}`, { method: 'GET' });
}

export async function forceReleaseContract(contractId, data) {
  return apiFetch(`/admin/contracts/${contractId}/force-release`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function forceRefundContract(contractId, data) {
  return apiFetch(`/admin/contracts/${contractId}/force-refund`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveCheckerContract(contractId) {
  return apiFetch(`/admin/contracts/${contractId}/checker-approve`, {
    method: 'POST',
  });
}
