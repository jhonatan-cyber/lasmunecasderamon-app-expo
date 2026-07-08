import { apiClientSafe } from '@/api/client-safe';

export const serviciosService = {
  list: (limit = 50, page = 1) =>
    apiClientSafe(`/servicios?all=true&limit=${limit}&page=${page}`),

  getUserServices: () =>
    apiClientSafe('/servicios/user'),

  getById: (id: string | number) =>
    apiClientSafe(`/servicios/${id}`),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/servicios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  create: (data: Record<string, unknown>) =>
    apiClientSafe('/servicios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createTemporal: (data: Record<string, unknown>) =>
    apiClientSafe('/servicios/temporal', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
