import { apiClientSafe } from '@/api/client-safe';

export const dashboardService = {
  stats: () =>
    apiClientSafe('/dashboard/stats', { method: 'GET' }),

  salesChart: () =>
    apiClientSafe('/dashboard/sales-chart', { method: 'GET' }),
};
