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
