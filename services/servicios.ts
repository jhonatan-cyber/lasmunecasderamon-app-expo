import { apiClientSafe } from '@/api/client-safe';
import type { MetodoPago, Servicio } from '@lasmunecasderamon/types';
import type { SolicitudServicioCreateType, ServiceCreateType } from '@lasmunecasderamon/validations';
import type { Timer } from '@/context/types';
import { safeNumber } from '@/utils/format';
import { parseDateSafe } from '@/utils/timeUtils';
import {
  calcularComisionServicio,
  contarUsuariosServicio,
} from '@/utils/servicioTotales';

const METODOS_PAGO: MetodoPago[] = [
  'efectivo',
  'tarjeta',
  'transferencia',
  'prepago',
  'mixto',
];

const metodoPagoValido = (valor: unknown): MetodoPago =>
  METODOS_PAGO.includes(valor as MetodoPago) ? (valor as MetodoPago) : '';

const listaDeTexto = (valor: unknown): string[] => {
  if (Array.isArray(valor))
    return valor.map((item) => String(item).trim()).filter(Boolean);
  if (typeof valor === 'string')
    return valor.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

export interface ServiciosListado {
  success: boolean;
  items: Servicio[];
  total: number;
  message?: string;
}

/** Unifica la forma de `/services` y `/services/user` en la entidad `Servicio`. */
export function mapServicio(raw: any): Servicio {
  const anfitrionasIds = listaDeTexto(raw?.anfitrionas_ids);
  const anfitrionasNombres = listaDeTexto(
    raw?.anfitrionas_nombres ?? raw?.anfitriona,
  );
  const totalUsuarios = contarUsuariosServicio({
    totalUsuarios: raw?.total_usuarios,
    anfitrionasIds,
    anfitrionasNombres,
  });
  const habitacionComision = safeNumber(raw?.habitacion_comision);
  const comision = calcularComisionServicio({
    habitacionComision,
    comisionIndividual: raw?.comision_individual ?? null,
    precioServicioUnidad: safeNumber(raw?.precio_servicio),
    totalUsuarios,
  });
  const comisionIndividual =
    raw?.comision_individual != null
      ? safeNumber(raw.comision_individual)
      : comision.comisionIndividual;
  const totalComision =
    raw?.total_comision != null
      ? safeNumber(raw.total_comision)
      : comision.totalComision;

  const nombreCreator = [raw?.creator_nombre, raw?.creator_apellido]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id_servicio: safeNumber(raw?.id ?? raw?.id_servicio),
    codigo: String(raw?.codigo ?? ''),
    estado: safeNumber(raw?.estado),
    pago_estado:
      raw?.pago_estado != null ? safeNumber(raw.pago_estado) : undefined,
    tiempo: safeNumber(raw?.tiempo),
    fecha_crea: parseDateSafe(
      raw?.fecha_crea ?? raw?.created_at ?? raw?.startTime,
    ).toISOString(),
    fecha_mod: raw?.fecha_mod ?? null,
    precio_servicio: safeNumber(raw?.precio_servicio),
    precio_habitacion: safeNumber(raw?.precio_habitacion),
    iva: safeNumber(raw?.iva),
    sub_total: safeNumber(raw?.sub_total),
    total: safeNumber(raw?.total),
    metodo_pago: metodoPagoValido(raw?.metodo_pago),
    comision_usuario:
      raw?.comision_usuario != null
        ? safeNumber(raw.comision_usuario)
        : comisionIndividual,
    comision_individual: comisionIndividual,
    total_comision: totalComision,
    total_usuarios: totalUsuarios,
    habitacion:
      raw?.habitacion_nombre ??
      raw?.habitacion_numero ??
      raw?.habitacion ??
      raw?.roomName ??
      'Servicio de barra',
    habitacion_id: raw?.habitacion_id ?? raw?.habitacionId ?? null,
    habitacion_comision: habitacionComision,
    anfitriona: anfitrionasNombres.join(', '),
    anfitrionas_ids: anfitrionasIds,
    anfitrionas_fotos: listaDeTexto(raw?.anfitrionas_fotos),
    cliente:
      raw?.cliente_nombre ?? raw?.cliente ?? raw?.clienteNombre ?? 'Sin cliente registrado',
    cliente_id: raw?.cliente_id ?? null,
    creado_por: raw?.creado_por ?? null,
    waiter_name: (raw?.waiter_name ?? raw?.creator_nick ?? nombreCreator) || null,
    waiter_foto: raw?.waiter_foto ?? raw?.creator_foto ?? null,
    solicitante_name: raw?.solicitante_name ?? raw?.solicitante ?? null,
    solicitante_foto: raw?.solicitante_foto ?? null,
    es_temporal: Boolean(Number(raw?.es_temporal ?? 0)),
    servicio_original_id:
      raw?.servicio_original_id != null
        ? String(raw.servicio_original_id)
        : null,
    pagos_mixtos: Array.isArray(raw?.pagos_mixtos) ? raw.pagos_mixtos : [],
  };
}

/** Convierte un servicio ya finalizado al formato `Timer` que consume la lista. */
export function servicioATimer(servicio: Servicio): Timer {
  return {
    id: String(servicio.id_servicio),
    servicioId: String(servicio.id_servicio),
    roomId: String(servicio.habitacion_id ?? 'barra'),
    roomName: servicio.habitacion,
    duration: servicio.tiempo,
    remainingTime: 0,
    isActive: false,
    isPaused: false,
    startTime: parseDateSafe(servicio.fecha_crea),
    servicioCode: servicio.codigo,
    cliente_id:
      servicio.cliente_id != null ? String(servicio.cliente_id) : null,
    clienteNombre: servicio.cliente,
    tipoTransaccion: 'servicio',
    anfitrionas: servicio.anfitriona,
    precio_servicio: servicio.precio_servicio,
    precio_habitacion: servicio.precio_habitacion,
    iva: servicio.iva,
    total: servicio.total,
    metodo_pago: servicio.metodo_pago,
    waiter_name: servicio.waiter_name ?? undefined,
    waiter_foto: servicio.waiter_foto ?? undefined,
    solicitante_name: servicio.solicitante_name ?? undefined,
    solicitante_foto: servicio.solicitante_foto ?? undefined,
    habitacion_comision: servicio.habitacion_comision,
    anfitrionas_ids: servicio.anfitrionas_ids,
    anfitrionas_fotos: servicio.anfitrionas_fotos,
    created_at: servicio.fecha_crea,
    estado: servicio.estado,
    total_usuarios: servicio.total_usuarios,
    comision_individual: servicio.comision_individual,
    total_comision: servicio.total_comision,
    es_temporal: servicio.es_temporal,
    servicio_original_id: servicio.servicio_original_id,
  };
}

export interface ListarServiciosParams {
  page?: number;
  limit?: number;
  /** `true` = finalizados/anulados, `false` = en curso, `undefined` = todos. */
  all?: boolean;
  estado?: number;
  /** Filtra por caja/turno. */
  caja_id?: string;
}

function normalizarPagina(
  payload: unknown,
): { rows: any[]; total: number } {
  if (Array.isArray(payload)) return { rows: payload, total: payload.length };
  const data = (payload as { data?: unknown })?.data;
  const rows = Array.isArray(data) ? data : [];
  const total = safeNumber((payload as { total?: unknown })?.total) || rows.length;
  return { rows, total };
}

async function actualizarServicio(
  id: string | number,
  data: Record<string, unknown>,
) {
  const res = await apiClientSafe<any>(`/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return {
    success: res.success,
    data: res.success && res.data ? mapServicio(res.data) : null,
    message: res.message,
  };
}

export const serviciosService = {
  async listar(params: ListarServiciosParams = {}): Promise<ServiciosListado> {
    const { page = 1, limit = 100, all = true, estado, caja_id } = params;
    const query = new URLSearchParams({
      all: String(all),
      limit: String(limit),
      page: String(page),
    });
    if (estado != null) query.set('estado', String(estado));
    if (caja_id) query.set('caja_id', caja_id);

    const res = await apiClientSafe<unknown>(`/services?${query.toString()}`);
    const { rows, total } = normalizarPagina(res.data);
    return {
      success: res.success,
      items: rows.map(mapServicio),
      total,
      message: res.message,
    };
  },

  async getUserServices() {
    const res = await apiClientSafe<unknown>('/services/user');
    const rows = Array.isArray(res.data)
      ? res.data
      : Array.isArray((res.data as { data?: unknown })?.data)
        ? ((res.data as { data: unknown[] }).data)
        : [];
    return {
      success: res.success,
      items: rows.map(mapServicio),
      message: res.message,
    };
  },

  async getById(id: string | number) {
    const res = await apiClientSafe<any>(`/services/${id}`);
    return {
      success: res.success,
      data: res.success && res.data ? mapServicio(res.data) : null,
      message: res.message,
    };
  },

  async actualizarEstado(id: string | number, estado: number) {
    return actualizarServicio(id, { estado });
  },

  async update(id: string | number, data: Record<string, unknown>) {
    return actualizarServicio(id, data);
  },

  async create(payload: ServiceCreateType, idempotencyKey?: string) {
    const res = await apiClientSafe<any>('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
    });
    return {
      success: res.success,
      data: res.success && res.data ? mapServicio(res.data) : null,
      message: res.message,
    };
  },

  async createTemporal(data: Record<string, unknown>, idempotencyKey?: string) {
    const res = await apiClientSafe<any>('/services/temporary', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
    });
    return {
      success: res.success,
      data: res.success && res.data ? mapServicio(res.data) : null,
      message: res.message,
    };
  },

  /** Solicitud de servicio (garzón/barman). Esta ruta no soporta idempotencia. */
  async crearSolicitud(payload: SolicitudServicioCreateType) {
    const res = await apiClientSafe<{ id?: string | number }>(
      '/service-requests',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return {
      success: res.success,
      id: res.data?.id != null ? String(res.data.id) : null,
      message: res.message,
    };
  },
};
