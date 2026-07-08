import { apiClientSafe } from '@/api/client-safe';

export interface GenerateQRPayload {
  userId: string | number;
}

export const usersService = {
  list: (params?: string) =>
    apiClientSafe(`/users${params ? `?${params}` : ''}`),

  status: () =>
    apiClientSafe('/users/status'),

  meStats: () =>
    apiClientSafe('/users/me/stats'),

  getProfile: () =>
    apiClientSafe('/users/profile'),

  updateProfile: (data: Record<string, unknown>) =>
    apiClientSafe('/users', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getById: (id: string | number) =>
    apiClientSafe(`/users/${id}`),

  generateQR: (data: GenerateQRPayload) =>
    apiClientSafe('/users/generate-qr', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
