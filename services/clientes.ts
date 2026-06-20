import { apiClient } from '@/api/client';

export const clientesService = {
  list: () =>
    apiClient('/clients'),

  getById: (id: string | number) =>
    apiClient(`/clients?id=${id}`),

  create: (payload: any) =>
    apiClient('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string | number, payload: any) =>
    apiClient('/clients', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id: string | number) =>
    apiClient(`/clients?id=${id}`, {
      method: 'DELETE',
    }),

  getHistory: (clienteId: string | number) =>
    apiClient(`/clients/history?cliente_id=${clienteId}`),

  prepago: (payload: any) =>
    apiClient('/clients/prepago', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
