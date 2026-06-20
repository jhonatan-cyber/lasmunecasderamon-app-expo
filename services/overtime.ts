import { apiClient } from '@/api/client';

export const overtimeService = {
  list: () =>
    apiClient('/overtime'),

  user: () =>
    apiClient('/overtime/user'),
};
