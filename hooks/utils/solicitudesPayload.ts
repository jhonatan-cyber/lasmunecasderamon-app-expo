import { calcularPropina } from "@lasmunecasderamon/sale-totals";
import type { Cliente } from "@lasmunecasderamon/types";
import {
  saleInventoryFields,
  type SaleInventoryFields,
} from "@/hooks/utils/saleInventoryFields";
import type { PedidoItem } from "@/hooks/types/solicitudesTypes";

export interface PedidoDetalle {
  configuracion_venta?: SaleInventoryFields;
  comision?: number;
  anfitrionas_asignadas_ids?: string;
  producto_id: string;
  cantidad: number;
  precio: number;
  subtotal_detalle?: number;
  cliente_id?: string | number | null;
  habitacion_id?: string | number | null;
  propina?: number;
}

interface DetallePago {
  producto_id: string;
  cantidad: number;
  precio: number;
  sub_total: number;
}

interface SalesSubmitPayload {
  id_pedido: string;
  cliente_id: string | number | null;
  metodo_pago: string;
  metodo_pago_adicional?: string;
  monto_prepago: number;
  duracion_habitacion: number;
  detalles: DetallePago[];
  sub_total: number;
  total: number;
  ganancia_tipo: string;
  ganancia_monto: number;
  comision_por_cliente: boolean;
  recompensa_binario: boolean;
  recompensa_activos: boolean;
  recompensa_activos_monto: number;
  ganancia_anfitriona: number;
  ganancia_garzon: number;
  ganancia_local: number;
  ganancia_empresa: number;
  total_comision: number;
  tiempo: number;
  usuarios: never[];
  propina?: number;
}

interface BuildSalesPayloadParams {
  pedido: PedidoItem;
  detalles: PedidoDetalle[];
  cliente: Cliente | null;
  metodoPago: string;
  metodoPagoAdicional: string;
  propinaPct: number;
  agregarPropina: boolean;
  duracionMinutos: number;
}

/** Arma el payload de cobro de un pedido, incluida la propina y el prepago. */
export function buildSalesSubmitPayload({
  pedido,
  detalles,
  cliente,
  metodoPago,
  metodoPagoAdicional,
  propinaPct,
  agregarPropina,
  duracionMinutos,
}: BuildSalesPayloadParams): SalesSubmitPayload {
  const propinaOriginal = Number(pedido.propina || detalles?.[0]?.propina || 0);
  const subtotalBase = Number(
    pedido.subtotal ?? Math.max(0, Number(pedido.total || 0) - propinaOriginal),
  );
  const propinaFinal =
    propinaOriginal > 0
      ? propinaOriginal
      : calcularPropina(subtotalBase, propinaPct, agregarPropina);
  const totalConPropina = subtotalBase + propinaFinal;
  const saldoPrepago = cliente ? Number(cliente.saldo || 0) : 0;

  let montoPrepago = 0;
  if (metodoPago === "prepago" && cliente && saldoPrepago > 0) {
    montoPrepago = Math.min(totalConPropina, saldoPrepago);
  }

  const clienteId =
    pedido.cliente_id || detalles?.[0]?.cliente_id || cliente?.id || null;

  const payload: SalesSubmitPayload = {
    id_pedido: pedido.id_pedido ?? "",
    cliente_id: clienteId ?? null,
    metodo_pago: metodoPago,
    metodo_pago_adicional: metodoPagoAdicional || undefined,
    monto_prepago: montoPrepago,
    duracion_habitacion: duracionMinutos,
    detalles: detalles.map((d) => ({
      ...saleInventoryFields(d),
      comision: Number(d.comision ?? 0),
      hostesses: d.anfitrionas_asignadas_ids?.split(",").filter(Boolean) ?? [],
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio: d.precio,
      sub_total: d.subtotal_detalle || d.cantidad * d.precio,
    })),
    sub_total: subtotalBase,
    total: totalConPropina,
    ganancia_tipo: "fijo",
    ganancia_monto: 0,
    comision_por_cliente: false,
    recompensa_binario: false,
    recompensa_activos: false,
    recompensa_activos_monto: 0,
    ganancia_anfitriona: 0,
    ganancia_garzon: 0,
    ganancia_local: 0,
    ganancia_empresa: 0,
    total_comision: 0,
    tiempo: duracionMinutos,
    usuarios: [],
  };

  if (propinaFinal > 0) {
    payload.propina = propinaFinal;
  }

  return payload;
}

interface BuildAccountPayloadParams {
  codigo: string;
  pedido: PedidoItem;
  detalles: PedidoDetalle[];
  cliente: Cliente | null;
  duracionMinutos: number;
}

/** Arma el payload de una cuenta abierta a partir del pedido cobrado. */
export function buildAccountPayload({
  codigo,
  pedido,
  detalles,
  cliente,
  duracionMinutos,
}: BuildAccountPayloadParams) {
  const clienteId =
    pedido.cliente_id || detalles?.[0]?.cliente_id || cliente?.id || null;
  const habitacionId = detalles?.[0]?.habitacion_id || null;
  const detalle = detalles.map((d) => ({
    ...saleInventoryFields(d),
    comision: Number(d.comision ?? 0),
    hostesses: d.anfitrionas_asignadas_ids?.split(",").filter(Boolean) ?? [],
    producto_id: d.producto_id,
    cantidad: d.cantidad,
    precio: d.precio,
    sub_total: d.cantidad * d.precio,
  }));

  const subTotal = detalle.reduce((sum, d) => sum + d.sub_total, 0);
  const total = subTotal;

  return {
    codigo,
    cliente_id: clienteId,
    habitacion_id: habitacionId,
    tiempo: duracionMinutos || 30,
    metodo_pago: "efectivo",
    sub_total: subTotal,
    total,
    total_comision: 0,
    detalles: detalle,
  };
}
