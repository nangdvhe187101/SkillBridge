import { apiFetch } from './authApi';

export async function createPaymentOrder(provider, amount) {
  return apiFetch('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify({ provider, amount }),
  });
}

export async function getPaymentOrderStatus(orderCode) {
  return apiFetch(`/payments/orders/${encodeURIComponent(orderCode)}/status`, {
    method: 'GET',
  });
}

export async function getActivePendingOrder() {
  return apiFetch('/payments/orders/pending', {
    method: 'GET',
  });
}

export async function cancelPendingOrder(orderCode) {
  return apiFetch(`/payments/orders/${encodeURIComponent(orderCode)}/cancel`, {
    method: 'POST',
  });
}

export async function purchaseSubscription(planType) {
  return apiFetch('/subscriptions/purchase', {
    method: 'POST',
    body: JSON.stringify({ planType }),
  });
}

