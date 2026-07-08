import { apiClientSafe } from '@/api/client-safe';

export const eventsService = {
  getUserEvents: (params?: string) =>
    apiClientSafe(`/events/user${params ? `?${params}` : ''}`),

  stats: () =>
    apiClientSafe('/events/stats'),

  detail: (id: string | number, type: string) =>
    apiClientSafe(`/events/detail/${id}?type=${type}`),
};
