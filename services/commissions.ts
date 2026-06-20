import { apiClient } from '@/api/client';

export const commissionsService = {
  user: () =>
    apiClient('/commissions/user'),
};
