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
