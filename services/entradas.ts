import { apiClientSafe } from '@/api/client-safe';

export type MetodoPagoEntrada = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoCover = 'pendiente' | 'entregada' | 'anulada';
/** Anulada a mano se devuelve; anulada por el cierre del turno se cobra en caja. */
export type AnulacionOrigen = 'manual' | 'cierre';

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
  /** Bebida servida en la barra, ya formateada como `producto · presentación`. */
  bebida_cover: string | null;
  /** Acompañamiento configurado para la bebida servida. */
  acompanamiento_bebida: string | null;
  productos_cover: string | null;
  cantidad_productos_cover: number;
  fecha: string;
  /** `HH:MM` (formato del servidor). */
  hora: string;
  registrado_por_nombre: string;
  cover_estado: EstadoCover;
  /** Solo tiene valor cuando `cover_estado` es `anulada`. */
  anulacion_origen: AnulacionOrigen | null;
  cover_entregada_at: string | null;
  cover_entregada_por_nombre: string | null;
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

/** Fila de la cola de la barra: una persona que aún no recibió su bebida. */
export interface EntradaPendiente {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  monto_entrada: number;
  metodo_pago: MetodoPagoEntrada;
  fecha: string;
  /** `HH:MM`. */
  hora: string;
  caja_id: string;
  registrado_por_nombre: string;
}

export interface EntregaEntradaPayload {
  presentacion_id: string;
  /**
   * `corte` sirve un trago (precio del shot, descuenta ml); `botella` sirve la
   * presentación completa. El servidor toma `botella` si se omite.
   */
  tipo_entrega?: 'corte' | 'botella';
  /** Obligatorio cuando la bebida trae acompañamiento configurado. */
  acompanamiento_presentacion_id?: string | null;
  /**
   * Reparto del acompañamiento por sabor (sabor + unidades). Tiene prioridad
   * sobre `acompanamiento_presentacion_id` cuando viene con datos.
   */
  acompanamientos?: { presentacion_id: string; unidades: number }[] | null;
  /**
   * Lo que el cliente paga de mas en la barra. Sin valor, el servidor deriva
   * la diferencia entre el precio y lo ya pagado en la puerta.
   */
  monto_adicional?: number;
}

/** Resultado de la entrega: cover o adicional cobrado en la barra. */
export interface ResultadoEntrega {
  entradaId: string;
  tipo: 'cover' | 'upgrade';
  presentacionId: string;
  /** Precio de lista de la bebida entregada. */
  precio: number;
  /** Lo que el cliente ya pagó en la puerta. */
  montoEntrada: number;
  /** Lo que el cliente entrega en la barra (0 en el cover). */
  montoCobrarBarra: number;
  ventaId: string | null;
  cajaId: string;
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

  /** Registro en la puerta: cobra la entrada y deja el cover pendiente. */
  registrar: (payload: RegistroEntradaPayload) =>
    apiClientSafe<RegistroEntradaResultado>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Cola de la barra: entradas cobradas que todavía no se sirvieron. */
  pendientes: (fecha?: string) =>
    apiClientSafe<EntradaPendiente[]>(
      fecha ? `/tickets/pendientes?fecha=${encodeURIComponent(fecha)}` : '/tickets/pendientes',
    ),

  /**
   * Anula una entrada que nunca se sirvió: el monto cobrado en la puerta queda
   * registrado en la caja y la fila deja de estar pendiente.
   */
  anular: (entradaId: string) =>
    apiClientSafe<{ entradaId: string; monto: number }>(
      `/tickets/${encodeURIComponent(entradaId)}/anular`,
      { method: 'POST' },
    ),

  /** Entrega en la barra: el servidor decide cover o adicional según el precio. */
  entregar: (entradaId: string, payload: EntregaEntradaPayload) =>
    apiClientSafe<ResultadoEntrega>(`/tickets/${encodeURIComponent(entradaId)}/entregar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  solicitarEntregaCovers: (payload: {
    grupo_registro_id: string | null;
    cliente_nombre: string | null;
    entrada_ids: string[];
    unidades: Array<Record<string, unknown>>;
    monto_total: number;
  }) =>
    apiClientSafe<{ id: string }>('/tickets/cover-solicitudes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listarSolicitudesCovers: (estado = 'pendiente') =>
    apiClientSafe<any[]>(
      `/tickets/cover-solicitudes?estado=${encodeURIComponent(estado)}`,
    ),

  aprobarSolicitudCovers: (id: string) =>
    apiClientSafe<{ entregadas: number }>(
      `/tickets/cover-solicitudes/${encodeURIComponent(id)}/approve`,
      { method: 'PATCH' },
    ),

  rechazarSolicitudCovers: (id: string, motivo: string) =>
    apiClientSafe<unknown>(
      `/tickets/cover-solicitudes/${encodeURIComponent(id)}/reject`,
      {
        method: 'PATCH',
        body: JSON.stringify({ motivo }),
      },
    ),
};
