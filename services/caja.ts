import { apiClientSafe } from '@/api/client-safe';

export interface OpenCajaPayload {
  monto_apertura: number;
  usuario_id_apertura: string | number;
}

export interface SolicitudCierreCajaPayload {
  id_caja: string | number;
  motivo?: string;
}

/**
 * Resultado de pedir el cierre. `pendiente` no es un error: la caja sigue abierta
 * esperando que el administrador autorice el link que le llega por WhatsApp.
 * `cerrada` sólo lo devuelve el servidor para un administrador, que cierra en el
 * acto.
 */
export interface SolicitudCierreCajaRes {
  estado: 'cerrada' | 'pendiente';
  token: string | null;
  monto_cierre_calculado: number;
  saldo_clientes_descontado: number;
  caja: any;
}

export interface ReenvioAvisoCierreRes {
  ultimo_aviso_en: string | null;
  /** Segundos que faltan para poder reenviar (0 = puede ya). */
  esperar_segundos: number;
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

  /**
   * Pedir el cierre. Desde el teléfono nunca se cierra directo: el servidor crea
   * la solicitud y avisa al administrador por WhatsApp para que la autorice.
   */
  solicitarCierre: (data: SolicitudCierreCajaPayload) =>
    apiClientSafe<SolicitudCierreCajaRes>('/cashregister/cierre', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Reenviar al administrador el aviso del cierre que quedó pendiente.
   *
   * No crea una solicitud nueva (el servidor solo admite una por turno): vuelve a mandar el
   * mismo link por WhatsApp. El servidor enfría los reenvíos y contesta 429 si todavía no
   * pasó el minuto, así que el error trae el motivo en el cuerpo.
   */
  reenviarAvisoCierre: (data: SolicitudCierreCajaPayload) =>
    apiClientSafe<ReenvioAvisoCierreRes>('/cashregister/cierre/reenviar', {
      method: 'POST',
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
