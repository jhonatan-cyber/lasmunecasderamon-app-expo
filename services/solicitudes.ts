import { apiClientSafe } from '@/api/client-safe';

export const solicitudesService = {
  list: (estado = 0) =>
    apiClientSafe(`/service-requests?estado=${estado}`),

  create: (data: Record<string, unknown>) =>
    apiClientSafe('/service-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string | number) =>
    apiClientSafe(`/service-requests/${id}/approve`, {
      method: 'PATCH',
    }),

  reject: (id: string | number) =>
    apiClientSafe(`/service-requests/${id}/reject`, {
      method: 'PATCH',
    }),

  pendingCount: () =>
    apiClientSafe('/service-requests/pending-count'),
};
