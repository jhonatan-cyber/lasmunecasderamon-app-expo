import { apiClient } from '@/api/client';

export const cuentasService = {
  list: (limit = 50) =>
    apiClient(`/cuentas?limit=${limit}&_t=${Date.now()}`),

  resumen: () =>
    apiClient(`/cuentas?tipo=resumen&_t=${Date.now()}`),

  getById: (id: string | number) =>
    apiClient(`/cuentas/${id}?_t=${Date.now()}`),

  create: (payload: any) =>
    apiClient('/cuentas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string | number, payload: any) =>
    apiClient(`/cuentas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  cobrar: (id: string | number, payload: any) =>
    apiClient(`/cuentas/${id}/cobrar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  stopTimer: (id: string | number) =>
    apiClient(`/cuentas/${id}/stop`, {
      method: 'PATCH',
    }),

  solicitarAnulacion: (payload: any) =>
    apiClient('/cuentas/anulacion', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
