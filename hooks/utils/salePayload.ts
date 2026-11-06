import type { AcompanamientoBotella } from "@/types/cart";

export interface SalePayloadInput {
  servicioId?: string;
  servicioAnfitrionas?: string[];
  cart: any[];
  selectedCliente: any;
  selectedHabitacion: any;
  metodoPago: string;
  pagosMixtos: unknown[];
  totals: { subtotal: number; tip: number; total: number };
  selectedTime: number;
  hasCommissionItem: boolean;
  /** Foto del baucher en data URL; obligatoria cuando el pago es transferencia. */
  baucherFoto?: string | null;
  prepagoDestinos?: { cliente_id: string; monto: number }[];
}

export interface SaleCreatePayload {
  servicio_id?: string;
  servicio_anfitrionas?: string[];
  detalles: {
    producto_id: string | number;
    presentacion_id: string | number | null;
    tipo_venta?: "botella" | "shot";
    botella_anfitriona?: boolean;
    shot_anfitriona?: boolean;
    acompanamiento_botella?: AcompanamientoBotella;
    acompanamiento_corto?: {
      presentacion_id: string;
      unidades?: number;
      ml_por_corto?: number;
    };
    isChampagne: boolean;
    cantidad: number;
    precio: number;
    sub_total: number;
    comision: number;
    hostess_id?: string;
    hostesses?: string[];
  }[];
  cliente_id: string | null;
  habitacion_id: string | number | null;
  metodo_pago: string;
  pagos_mixtos?: unknown[];
  propina: number;
  sub_total: number;
  total: number;
  tiempo: number;
  usuarios: (string | number)[];
  baucher_foto?: string;
  prepago_destinos?: { cliente_id: string; monto: number }[];
}

const idDe = (valor: any): string | number | null =>
  valor?.id_usuario ?? valor?.id ?? valor?.id_cliente ?? null;

export function buildSalePayload(input: SalePayloadInput): SaleCreatePayload {
  const {
    cart,
    selectedCliente,
    selectedHabitacion,
    metodoPago,
    pagosMixtos,
    totals,
    selectedTime,
    hasCommissionItem,
  } = input;

  return {
    ...(input.servicioId ? { servicio_id: input.servicioId } : {}),
    ...(input.servicioId && input.servicioAnfitrionas !== undefined
      ? { servicio_anfitrionas: input.servicioAnfitrionas }
      : {}),
    detalles: cart.map((item) => {
      const cantidad = item.quantity || item.cantidad || 1;
      const esShot = item.tipo_venta === "shot";
      const hasCommission = Number(item.comision || item.commission || 0) > 0;
      const hostesses: string[] = (hasCommission ? item.anfitrionas || [] : [])
        .map((a: any) => (typeof a === "object" ? idDe(a) : a))
        .filter(
          (id: string | number | null): id is string | number => id !== null,
        )
        .map(String);
      const categoria = String(
        item.categoria || item.category_name || item.category || "",
      )
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const isChampagne =
        Boolean(item.isChampagne) ||
        categoria.includes("champagne") ||
        categoria.includes("champana") ||
        categoria.includes("shampana");
      const detalle = {
        producto_id: String(item.producto_id || item.id_producto || item.id),
        presentacion_id: item.presentacion_id
          ? String(item.presentacion_id)
          : null,
        tipo_venta: esShot
          ? ("shot" as const)
          : item.presentacion_id
            ? ("botella" as const)
            : undefined,
        ...(!esShot ? { botella_anfitriona: item.botella_anfitriona !== false } : {}),
        ...(esShot ? { shot_anfitriona: Boolean(item.shot_anfitriona) } : {}),
        ...(!esShot && item.acompanamiento_botella
          ? { acompanamiento_botella: item.acompanamiento_botella }
          : {}),
        ...(esShot && item.acompanamiento_corto
          ? { acompanamiento_corto: item.acompanamiento_corto }
          : {}),
        isChampagne,
        cantidad,
        precio: item.precio || item.price || 0,
        sub_total: (item.precio || item.price || 0) * cantidad,
        comision:
          hostesses.length > 0
            ? Number(item.comision || item.commission || 0) * cantidad
            : 0,
      };
      if (hostesses.length === 0) return detalle;
      if (isChampagne || hostesses.length > 1) return { ...detalle, hostesses };
      return { ...detalle, hostess_id: hostesses[0] };
    }),
    cliente_id: (selectedCliente?.id?.toString() ||
      selectedCliente?.id_cliente?.toString() ||
      null) as string | null,
    habitacion_id:
      input.servicioId || hasCommissionItem
        ? String(
          selectedHabitacion?.id ?? selectedHabitacion?.id_habitacion ?? "",
        ) || null
        : null,
    metodo_pago: metodoPago,
    ...(metodoPago === "transferencia" && input.baucherFoto
      ? { baucher_foto: input.baucherFoto }
      : {}),
    pagos_mixtos: metodoPago === "mixto" ? pagosMixtos : undefined,
    ...(metodoPago === "prepago" && input.prepagoDestinos?.length
      ? { prepago_destinos: input.prepagoDestinos }
      : {}),
    propina: totals.tip,
    sub_total: totals.subtotal,
    total: totals.total,
    tiempo: input.servicioId ? 0 : selectedHabitacion ? selectedTime : 0,
    usuarios: Array.from(
      new Set(
        cart
          .filter((item) => Number(item.comision || item.commission || 0) > 0)
          .flatMap((item) =>
            (item.anfitrionas || []).map((a: any) =>
              typeof a === "object" ? idDe(a) : a,
            ),
          )
          .filter(
            (id: string | number | null): id is string | number => id !== null,
          )
          .map(String),
      ),
    ),
  };
}

export function describeSale(label: {
  total?: number;
  items?: number;
  tipo?: "venta" | "consumo";
}): string {
  const prefijo = label.tipo === "consumo" ? "Consumos" : "Venta";
  const partes = [
    `${prefijo} $${Number(label.total ?? 0).toLocaleString("es-CL")}`,
  ];
  if (label.items) partes.push(`${label.items} ítem(s)`);
  return partes.join(" · ");
}
