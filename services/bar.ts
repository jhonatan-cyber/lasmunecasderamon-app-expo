import { apiClientSafe } from '@/api/client-safe';

export const barService = {
  stock: (signal?: AbortSignal) => apiClientSafe('/bar', { signal }),

  movements: (limit = 100, signal?: AbortSignal) =>
    apiClientSafe(`/bar/movements?limit=${limit}`, { signal }),

  pendingTransfers: (signal?: AbortSignal) =>
    apiClientSafe('/transfers/pending', { signal }),

  acceptTransfer: (id: string, signal?: AbortSignal) =>
    apiClientSafe(`/transfers/${id}/accept`, { method: 'POST', signal }),

  rejectTransfer: (id: string, signal?: AbortSignal) =>
    apiClientSafe('/transfers', {
      method: 'PATCH',
      body: JSON.stringify({ id, accion: 'rechazar' }),
      signal,
    }),
};
