import { apiClientSafe } from '@/api/client-safe';

export const barService = {
  stock: (signal?: AbortSignal) => apiClientSafe('/bar', { signal }),

  movements: (limit = 100, signal?: AbortSignal) =>
    apiClientSafe(`/bar/movements?limit=${limit}`, { signal }),

  /** Historial de envases entregados por el bar (devoluciones al almacén). */
  containers: (signal?: AbortSignal) => apiClientSafe('/bar/containers', { signal }),

  /** Contador del control de envases: entregados pendientes de recepción + atrasados. */
  containerSummary: (signal?: AbortSignal) => apiClientSafe('/bar/containers/summary', { signal }),

  /** Paso 1 del control de envases: verifica el código y lo marca como entregado. */
  returnContainer: (codigo: string) =>
    apiClientSafe('/bar/containers', {
      method: 'POST',
      body: JSON.stringify({ codigo }),
    }),

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
