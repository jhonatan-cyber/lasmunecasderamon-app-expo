import { apiClientSafe } from '@/api/client-safe';

export const commissionsService = {
  user: () =>
    apiClientSafe('/commissions/user'),
};
