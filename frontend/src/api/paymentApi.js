import { apiFetch } from './authApi';

const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || "http://localhost:5004/api";

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

export async function getPaymentOrderStatusPublic(orderCode) {
  const res = await fetch(`${API_URL}/payments/orders/${encodeURIComponent(orderCode)}/status-public`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Không tìm thấy thông tin đơn thanh toán.');
  }
  return res.json();
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
