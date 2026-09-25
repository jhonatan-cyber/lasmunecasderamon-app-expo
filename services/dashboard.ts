import { apiClientSafe } from '@/api/client-safe';

export const dashboardService = {
  stats: () =>
    apiClientSafe('/dashboard/composite', { method: 'GET' }),

  salesChart: () =>
    apiClientSafe('/stats/sales-by-week', { method: 'GET' }),
};
