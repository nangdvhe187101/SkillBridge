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



