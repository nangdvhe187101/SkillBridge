import { apiFetch } from './authApi';

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
