import { apiClient } from '@/api/client';

export const eventsService = {
  getUserEvents: (params?: string) =>
    apiClient(`/events/user${params ? `?${params}` : ''}`),

  stats: () =>
    apiClient('/events/stats'),

  detail: (id: string | number, type: string) =>
    apiClient(`/events/detail/${id}?type=${type}`),
};
