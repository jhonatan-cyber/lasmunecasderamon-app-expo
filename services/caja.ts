import { apiClientSafe } from '@/api/client-safe';

export interface OpenCajaPayload {
  monto_apertura: number;
  usuario_id_apertura: string | number;
}

export interface CloseCajaPayload {
  id_caja: string | number;
  monto_cierre: number;
  usuario_id_cierre: string | number;
}

export interface RetiroCajaPayload {
  id_caja: string | number;
  monto: number;
  motivo: string;
  usuario_id: string | number;
}

export const cajaService = {
  status: () =>
    apiClientSafe('/cashregister/status'),

  open: (data: OpenCajaPayload) =>
    apiClientSafe('/cashregister', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  close: (data: CloseCajaPayload) =>
    apiClientSafe('/cashregister', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  resumen: () =>
    apiClientSafe('/cashregister?resumen=1'),

  retiros: (data: RetiroCajaPayload) =>
    apiClientSafe('/cashregister/retiros', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stats: () =>
    apiClientSafe('/caja/stats'),
};
