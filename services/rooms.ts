import { apiClientSafe } from '@/api/client-safe';

export const roomsService = {
  list: (params?: string) =>
    apiClientSafe(`/rooms${params ? `?${params}` : ''}`),
};
