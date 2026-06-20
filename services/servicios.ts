import { apiClient } from '@/api/client';

export const serviciosService = {
  list: (limit = 50, page = 1) =>
    apiClient(`/servicios?all=true&limit=${limit}&page=${page}`),

  getUserServices: () =>
    apiClient('/servicios/user'),

  getById: (id: string | number) =>
    apiClient(`/servicios/${id}`),

  update: (id: string | number, payload: any) =>
    apiClient(`/servicios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  create: (payload: any) =>
    apiClient('/servicios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createTemporal: (payload: any) =>
    apiClient('/servicios/temporal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
