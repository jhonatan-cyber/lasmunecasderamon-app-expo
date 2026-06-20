import { apiClient } from '@/api/client';

export const roomsService = {
  list: (params?: string) =>
    apiClient(`/rooms${params ? `?${params}` : ''}`),
};
