import { apiClientSafe } from '@/api/client-safe';

/** Planilla pendiente de un trabajador: lo acumulado desde su última liquidación. */
export interface PayrollRow {
  id_usuario: string;
  rol: string;
  usuario: string;
  usuario_foto?: string | null;
  sueldos: number;
  aportes: number;
  ventas: number;
  servicios: number;
  anticipos: number;
  propinas: number;
  total_monto_horas: number;
  gratificaciones: number;
  descuentos: number;
  ultima_liquidacion_fecha?: string | null;
  ultima_liquidacion_monto?: number | null;
  ultima_liquidacion_por?: string | null;
  total: number;
}

export interface PagoNominaRes {
  monto: number;
  componentes: Record<string, number>;
}

export const payrollService = {
  list: (signal?: AbortSignal) => apiClientSafe<PayrollRow[]>('/payroll', { signal }),

  /**
   * `total_esperado` es el total que mostraba la lista: el servidor recalcula y
   * rechaza el pago si cambió, para no liquidar un monto distinto al confirmado.
   */
  pay: (usuarioId: string, totalEsperado: number) =>
    apiClientSafe<PagoNominaRes>('/payroll', {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId, total_esperado: totalEsperado }),
    }),
};
