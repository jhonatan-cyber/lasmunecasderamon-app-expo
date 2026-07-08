import { apiClientSafe } from '@/api/client-safe';

export interface ResetPasswordPayload {
  run: string;
}

export const authService = {
  resetPassword: (data: ResetPasswordPayload) =>
    apiClientSafe('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    apiClientSafe('/auth/me'),
};
