import { apiClientSafe } from '@/api/client-safe';

export interface GenerateQRPayload {
  userId: string | number;
}

export const usersService = {
  list: (params?: string, signal?: AbortSignal) =>
    apiClientSafe(`/users${params ? `?${params}` : ''}`, { signal }),

  status: (signal?: AbortSignal) =>
    apiClientSafe('/users/status', { signal }),

  meStats: (signal?: AbortSignal) =>
    apiClientSafe('/users/me/stats', { signal }),

  getProfile: (signal?: AbortSignal) =>
    apiClientSafe('/users/profile', { signal }),

  updateProfile: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe('/users', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    }),

  getById: (id: string | number, signal?: AbortSignal) =>
    apiClientSafe(`/users/${id}`, { signal }),

  generateQR: (data: GenerateQRPayload) =>
    apiClientSafe('/users/generate-qr', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
