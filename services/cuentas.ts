import { apiClientSafe } from '@/api/client-safe';

export const cuentasService = {
  list: (limit = 50) =>
    apiClientSafe(`/cuentas?limit=${limit}&_t=${Date.now()}`),

  resumen: () =>
    apiClientSafe(`/cuentas?tipo=resumen&_t=${Date.now()}`),

  getById: (id: string | number) =>
    apiClientSafe(`/cuentas/${id}?_t=${Date.now()}`),

  create: (data: Record<string, unknown>) =>
    apiClientSafe('/cuentas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/cuentas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cobrar: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/cuentas/${id}/cobrar`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stopTimer: (id: string | number) =>
    apiClientSafe(`/cuentas/${id}/stop`, {
      method: 'PATCH',
    }),

  solicitarAnulacion: (data: Record<string, unknown>) =>
    apiClientSafe('/cuentas/anulacion', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
