import { apiFetch } from './authApi';

export async function getMyWallet() {
  return apiFetch('/wallets/me', { method: 'GET' });
}

export async function topupWallet(amount, paymentMethod) {
  return apiFetch('/wallets/topup', {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod }),
  });
}
