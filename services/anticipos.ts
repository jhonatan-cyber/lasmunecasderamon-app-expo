import { apiClientSafe } from '@/api/client-safe';

export const anticiposService = {
  list: () =>
    apiClientSafe('/anticipos'),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/anticipos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  solicitudes: () =>
    apiClientSafe('/anticipos/solicitudes'),

  createSolicitud: (data: Record<string, unknown>) =>
    apiClientSafe('/anticipos/solicitudes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserAnticipos: () =>
    apiClientSafe('/anticipos/user'),

  getMaximo: () =>
    apiClientSafe('/anticipos/maximo'),
};
