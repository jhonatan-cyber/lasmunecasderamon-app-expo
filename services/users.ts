import { apiClient } from '@/api/client';

export const usersService = {
  list: (params?: string) =>
    apiClient(`/users${params ? `?${params}` : ''}`),

  status: () =>
    apiClient('/users/status'),

  meStats: () =>
    apiClient('/users/me/stats'),

  getProfile: () =>
    apiClient('/users/profile'),

  updateProfile: (payload: any) =>
    apiClient('/users', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getById: (id: string | number) =>
    apiClient(`/users/${id}`),

  generateQR: (payload: any) =>
    apiClient('/users/generate-qr', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
