import { apiClientSafe } from '@/api/client-safe';

export const anticiposService = {
  list: () =>
    apiClientSafe('/advances'),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/advances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  solicitudes: () =>
    apiClientSafe('/advances/requests'),

  createSolicitud: (data: Record<string, unknown>) =>
    apiClientSafe('/advances/requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserAnticipos: () =>
    apiClientSafe('/advances/user'),

  getMaximo: () =>
    apiClientSafe('/advances/max'),
};
