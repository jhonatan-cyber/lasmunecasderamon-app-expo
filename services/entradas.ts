import { apiClientSafe } from '@/api/client-safe';

export type MetodoPagoEntrada = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoCortesia = 'pendiente' | 'entregada' | 'anulada';

/**
 * Fila del listado de `/tickets` (contrato de `modules/entradas` del dashboard).
 * Cada fila es una persona del grupo registrado en la puerta.
 */
export interface EntradaCliente {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: MetodoPagoEntrada;
  /** Nombre del archivo del baucher en el servidor (solo transferencia). */
  baucher_foto: string | null;
  /** Caja (turno) en la que se cobró la entrada. */
  caja_id: string | null;
  venta_id: string | null;
  productos_cortesia: string | null;
  cantidad_productos_cortesia: number;
  fecha: string;
  /** `HH:MM` (formato del servidor). */
  hora: string;
  registrado_por_nombre: string;
  cortesia_estado: EstadoCortesia;
  cortesia_entregada_at: string | null;
  cortesia_entregada_por_nombre: string | null;
}

export interface RegistroEntradaPayload {
  cliente_nombre: string;
  cantidad_entradas: number;
  metodo_pago: MetodoPagoEntrada;
  /** Data URL `data:image/...;base64,...`: obligatoria con transferencia. */
  baucher_foto?: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  /** `HH:MM`. */
  hora: string;
  /** Total del grupo: `costo_entrada × cantidad`; el servidor lo revalida. */
  monto_entrada: number;
}

export interface RegistroEntradaResultado {
  ids: string[];
  id: string;
  grupo_registro_id: string;
  caja_id: string;
  monto_entrada: number;
  monto_total: number;
  cantidad_entradas: number;
}

export const entradasService = {
  /** Listado de un día. Sin `fecha`, el servidor usa el día de negocio actual. */
  listar: (fecha?: string) =>
    apiClientSafe<EntradaCliente[]>(
      fecha ? `/tickets?fecha=${encodeURIComponent(fecha)}` : '/tickets',
    ),

  /** Registro en la puerta: cobra la entrada y deja la cortesía pendiente. */
  registrar: (payload: RegistroEntradaPayload) =>
    apiClientSafe<RegistroEntradaResultado>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
