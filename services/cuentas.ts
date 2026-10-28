import { apiClientSafe } from '@/api/client-safe';

export const cuentasService = {
  list: (limit = 50) =>
    apiClientSafe(`/accounts?limit=${limit}&_t=${Date.now()}`),

  resumen: () =>
    apiClientSafe(`/accounts?tipo=resumen&_t=${Date.now()}`),

  getById: (id: string | number) =>
    apiClientSafe(`/accounts/${id}?_t=${Date.now()}`),

  create: (data: Record<string, unknown>) =>
    apiClientSafe('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cobrar: (id: string | number, data: Record<string, unknown>) =>
    apiClientSafe(`/accounts/${id}/charge`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stopTimer: (id: string | number) =>
    apiClientSafe(`/accounts/${id}/stop`, {
      method: 'PATCH',
    }),

  solicitarAnulacion: (data: Record<string, unknown>) =>
    apiClientSafe('/accounts/cancellation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
