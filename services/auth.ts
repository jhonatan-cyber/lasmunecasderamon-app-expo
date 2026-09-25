import { apiClientSafe } from '@/api/client-safe';

export interface ResetPasswordPayload {
  run: string;
}

export interface ChangePasswordPayload {
  password: string;
  confirmPassword: string;
}

export const authService = {
  resetPassword: (data: ResetPasswordPayload) =>
    apiClientSafe('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changePassword: (data: ChangePasswordPayload) =>
    apiClientSafe('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    apiClientSafe('/auth/me'),
};
