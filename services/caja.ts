import { apiClient } from '@/api/client';

export const cajaService = {
  status: () =>
    apiClient('/cashregister/status'),

  open: (payload: any) =>
    apiClient('/cashregister', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  close: (payload: any) =>
    apiClient('/cashregister', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  resumen: () =>
    apiClient('/cashregister?resumen=1'),

  retiros: (payload: any) =>
    apiClient('/cashregister/retiros', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  stats: () =>
    apiClient('/caja/stats'),
};
