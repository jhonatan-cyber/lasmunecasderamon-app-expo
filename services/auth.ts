import { apiClient } from '@/api/client';

export const authService = {
  resetPassword: (payload: any) =>
    apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () =>
    apiClient('/auth/me'),
};
