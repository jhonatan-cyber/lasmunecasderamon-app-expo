import { apiClient } from '@/api/client';

export const solicitudesService = {
  list: (estado = 0) =>
    apiClient(`/solicitudes-servicios?estado=${estado}`),

  create: (payload: any) =>
    apiClient('/solicitudes-servicios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  aprobar: (id: string | number) =>
    apiClient(`/solicitudes-servicios/${id}/aprobar`, {
      method: 'PATCH',
    }),

  rechazar: (id: string | number) =>
    apiClient(`/solicitudes-servicios/${id}/rechazar`, {
      method: 'PATCH',
    }),

  pendingCount: () =>
    apiClient('/solicitudes-servicios/pending-count'),
};
