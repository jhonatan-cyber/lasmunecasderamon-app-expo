import { apiClientSafe } from '@/api/client-safe';

export const solicitudesService = {
  list: (estado = 0) =>
    apiClientSafe(`/solicitudes-servicios?estado=${estado}`),

  create: (data: Record<string, unknown>) =>
    apiClientSafe('/solicitudes-servicios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  aprobar: (id: string | number) =>
    apiClientSafe(`/solicitudes-servicios/${id}/aprobar`, {
      method: 'PATCH',
    }),

  rechazar: (id: string | number) =>
    apiClientSafe(`/solicitudes-servicios/${id}/rechazar`, {
      method: 'PATCH',
    }),

  pendingCount: () =>
    apiClientSafe('/solicitudes-servicios/pending-count'),
};
