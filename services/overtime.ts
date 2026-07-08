import { apiClientSafe } from '@/api/client-safe';

export const overtimeService = {
  list: () =>
    apiClientSafe('/overtime'),

  user: () =>
    apiClientSafe('/overtime/user'),
};
