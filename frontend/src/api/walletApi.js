import { apiFetch } from './authApi';

export async function getMyWallet() {
  return apiFetch('/wallets/me', { method: 'GET' });
}

export async function purchaseSubscription(planType) {
  return apiFetch('/subscriptions/purchase', {
    method: 'POST',
    body: JSON.stringify({ planType }),
  });
}

export async function updateBankAccount(bankData) {
  return apiFetch('/wallets/bank-account', {
    method: 'POST',
    body: JSON.stringify(bankData),
  });
}

export async function verifyBankAccount(data) {
  return apiFetch('/wallets/verify-bank-account', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Bank Verification (Admin manual review flow)
export async function createBankVerificationRequest(data) {
  return apiFetch('/wallets/bank-verification/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function decodeBankQr(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/wallets/bank-verification/decode-qr', {
    method: 'POST',
    body: formData,
  });
}

export async function cancelBankVerificationRequest(requestId) {
  return apiFetch(`/wallets/bank-verification/${requestId}/cancel`, {
    method: 'POST',
  });
}

export async function getCurrentBankVerification() {
  return apiFetch('/wallets/bank-verification/current', {
    method: 'GET',
  });
}

// Admin Bank Verification APIs
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
