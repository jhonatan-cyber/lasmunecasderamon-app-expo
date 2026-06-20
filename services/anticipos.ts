import { apiClient } from '@/api/client';

export const anticiposService = {
  list: () =>
    apiClient('/anticipos'),

  update: (id: string | number, payload: any) =>
    apiClient(`/anticipos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  solicitudes: () =>
    apiClient('/anticipos/solicitudes'),

  createSolicitud: (payload: any) =>
    apiClient('/anticipos/solicitudes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getUserAnticipos: () =>
    apiClient('/anticipos/user'),

  getMaximo: () =>
    apiClient('/anticipos/maximo'),
};
