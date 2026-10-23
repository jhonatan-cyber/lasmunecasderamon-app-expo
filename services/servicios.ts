import { apiClientSafe } from '@/api/client-safe';

export const serviciosService = {
  list: (limit = 50, page = 1) =>
    apiClientSafe(`/services?all=true&limit=${limit}&page=${page}`),

  getUserServices: () =>
    apiClientSafe('/services/user'),

  getById: (id: string | number) =>
    apiClientSafe(`/services/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  create: (data: Record<string, unknown>) =>
    apiClientSafe('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createTemporal: (data: Record<string, unknown>) =>
    apiClientSafe('/services/temporary', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
