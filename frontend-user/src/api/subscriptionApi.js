import { apiFetch } from './authApi';

export const subscriptionApi = {
  getPlans: () => {
    return apiFetch('/subscriptions/plans', { method: 'GET' });
  },
  purchasePlan: (planCode) => {
    return apiFetch('/subscriptions/purchase', {
      method: 'POST',
      body: JSON.stringify({ planCode })
    });
  }
};
