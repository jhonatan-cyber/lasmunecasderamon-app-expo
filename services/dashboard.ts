import { apiClientSafe } from '@/api/client-safe';

export const dashboardService = {
  stats: () =>
    apiClientSafe('/dashboard/composite', { method: 'GET' }),

  /**
   * KPIs del usuario para la pantalla de Analíticas (paridad con la
   * `AnalyticsScreen` de Flutter): monto a cobrar + conteos de
   * servicios/comisiones/propinas, agrupados por rol en el backend.
   */
  summary: () =>
    apiClientSafe('/stats/dashboard-summary', { method: 'GET' }),

  salesChart: () =>
    apiClientSafe('/stats/sales-by-week', { method: 'GET' }),
};
