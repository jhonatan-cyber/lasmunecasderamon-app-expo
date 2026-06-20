import { apiClient } from '@/api/client';

export const dashboardService = {
  stats: () =>
    apiClient('/dashboard/stats', { method: 'GET' }),

  salesChart: () =>
    apiClient('/dashboard/sales-chart', { method: 'GET' }),
};
