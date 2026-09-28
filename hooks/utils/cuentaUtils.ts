import { showToast as showToastLazy } from '@/utils/toast-lazy';
import type { Cliente, Anfitriona, Producto, CartItem, CommissionPreview } from "@lasmunecasderamon/types";

export const showToast = (title: string, message: string, type: "success" | "error" | "info" = "error") => {
  showToastLazy({
    type,
    text1: title,
    text2: message,
    visibilityTime: 4000,
  });
};

const getChampagneTierLimit = (precio: number) => {
  if (precio >= 240000) return 5;
  if (precio >= 200000) return 4;
  if (precio >= 140000) return 3;
  if (precio >= 120000) return 2;
  return 1;
};

export let ivaRate = 0.19;

export const setIvaRate = (rate: number) => { ivaRate = rate; };

export const getIvaDecimal = () => ivaRate;

export const getIvaPercent = () => Math.round(ivaRate * 100);

export let expensiveDrinkThreshold = 30000;

export const setExpensiveDrinkThreshold = (v: number) => { expensiveDrinkThreshold = v; };

export const isExpensiveDrink = (producto: { precio?: number; price?: number }) => {
  const precio = Number(producto.precio || producto.price || 0);
  return precio >= expensiveDrinkThreshold;
};

export let cardSplitVenta = 0.51;
export let cardSplitPropina = 0.49;

const roundToThousand = (monto: number) => Math.round(monto / 1000) * 1000;

export const setCardSplit = (ventaPct: number, propinaPct: number) => {
  cardSplitVenta = ventaPct;
  cardSplitPropina = propinaPct;
};

export const getCardSplit = (total: number) => {
  const venta = roundToThousand(total * cardSplitVenta);
  const propina = roundToThousand(Math.max(0, total * cardSplitPropina));
  return { venta, propina };
};

export const isChampagneProduct = (producto: { categoria?: string }) => {
  const cat = (producto.categoria || "").toLowerCase();
  return cat.includes("champaña") || cat.includes("shampaña") || cat.includes("champagne");
};

export const getHostessLimit = (prod: { precio?: number; price?: number; max_anfitrionas?: number | null; categoria?: string }, qty: number = 1) => {
  const max = prod.max_anfitrionas;
  if (max !== null && max !== undefined && max > 0) return max * qty;
  const price = prod.precio ?? prod.price ?? 0;
  if (isChampagneProduct(prod)) {
    return getChampagneTierLimit(price) * qty;
  }
  return qty;
};

/** Un detalle nuevo que se suma a una cuenta ya abierta. */
export interface CuentaUpdateDetalle {
  producto_id: string | number;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  hostesses: (string | number)[];
  isChampagne?: boolean;
}

/**
 * Body de `PUT /cuentas/:id`: **incremento**, no reemplazo. El servidor suma
 * estos detalles a los que ya tiene la cuenta, y por eso el reintento sin red
 * tiene que ir con clave de idempotencia (si no, cargaría los productos dos
 * veces).
 */
export interface CuentaUpdatePayload {
  detalles: CuentaUpdateDetalle[];
  usuarios: (string | number)[];
  extraTiempo?: number;
  habitacion_id?: string | number;
  tiempo?: number;
}

export interface BuildConsumptionsInput {
  cart: CartItem[];
  cuentaDetalle: {
    usuarios?: { usuario_id?: number | string; id_usuario?: number | string }[];
    habitacion_id?: string | number | null;
  } | null;
  cuentaOriginal: { habitacion_id?: string | number | null } | null;
  selectedHabitacion: { id_habitacion?: string | number; id?: string | number } | null;
  selectedTime: number;
  extraTiempo: number;
  /** `true` si ya hay un temporizador corriendo para esta cuenta. */
  hasExistingTimer: boolean;
}

const idUsuario = (valor: any): number | null => {
  const id = valor?.usuario_id ?? valor?.id_usuario;
  return id === undefined || id === null ? null : Number(id);
};

/**
 * Arma el incremento de consumos de forma pura, para que el mismo body viaje
 * por el camino directo y por la cola de intenciones.
 */
export function buildConsumptionsPayload(input: BuildConsumptionsInput): CuentaUpdatePayload {
  const {
    cart,
    cuentaDetalle,
    cuentaOriginal,
    selectedHabitacion,
    selectedTime,
    extraTiempo,
    hasExistingTimer,
  } = input;

  const mergedHostessIds = new Set<number>();
  (cuentaDetalle?.usuarios || [])
    .map(idUsuario)
    .filter((id): id is number => id !== null)
    .forEach(id => mergedHostessIds.add(id));

  cart.forEach(item => {
    (item.selectedHostesses || []).forEach(hId => {
      if (hId) mergedHostessIds.add(Number(hId));
    });
  });

  const hasRoom = !!cuentaOriginal?.habitacion_id;
  const currentRoomId = cuentaDetalle?.habitacion_id ?? cuentaOriginal?.habitacion_id ?? null;
  const roomIdToUse = selectedHabitacion?.id_habitacion || selectedHabitacion?.id || null;
  const timeToUse = selectedHabitacion ? selectedTime : 0;
  const isSameRoomSelection =
    Boolean(roomIdToUse) && Boolean(currentRoomId) && String(roomIdToUse) === String(currentRoomId);

  const payload: CuentaUpdatePayload = {
    detalles: cart.map(item => ({
      producto_id: item.id_producto || item.id || '',
      precio: item.precio,
      cantidad: item.cantidad,
      sub_total: item.precio * item.cantidad,
      comision: item.comision * (item.cantidad || 1),
      hostesses: item.selectedHostesses || [],
      isChampagne: item.isChampagne,
    })),
    usuarios: Array.from(mergedHostessIds),
  };

  if (extraTiempo > 0 && hasRoom) {
    payload.extraTiempo = extraTiempo;
  }
  if (isSameRoomSelection && timeToUse > 0) {
    payload.extraTiempo = Number(payload.extraTiempo || 0) + timeToUse;
  } else if (!hasExistingTimer && roomIdToUse && timeToUse > 0) {
    payload.habitacion_id = roomIdToUse;
    payload.tiempo = timeToUse;
  } else if (selectedHabitacion) {
    payload.habitacion_id = selectedHabitacion.id_habitacion || selectedHabitacion.id;
    payload.tiempo = selectedTime;
  }

  return payload;
}

export const buildCommissionPreview = (items: CartItem[], hostesses: Anfitriona[]): CommissionPreview => {
  const totalCommission = items.reduce(
    (acc, item) => acc + Number(item.comision || 0) * Number(item.cantidad || 0),
    0,
  );
  const distribution = new Map<string, { id: string; name: string; amount: number }>();

  const addAmount = (hostessId: string | number, amount: number) => {
    if (!hostessId || amount <= 0) return;
    const key = String(hostessId);
    const hostess = hostesses.find((item) => String(item.id_usuario || item.id) === key);
    const current = distribution.get(key);
    distribution.set(key, {
      id: key,
      name: hostess?.nick || `Anfitriona ${key}`,
      amount: (current?.amount || 0) + amount,
    });
  };

  items.forEach((item) => {
    const selectedHostesses = Array.isArray(item.selectedHostesses)
      ? item.selectedHostesses.filter(Boolean)
      : [];
    const itemCommission = Number(item.comision || 0) * Number(item.cantidad || 0);

    if (itemCommission <= 0 || selectedHostesses.length === 0) return;

    if (item.isChampagne) {
      const totalRounded = Math.round(itemCommission);
      const base = Math.floor(totalRounded / selectedHostesses.length);
      const remainder = totalRounded % selectedHostesses.length;

      selectedHostesses.forEach((hostessId, index) => {
        addAmount(hostessId, base + (index === 0 ? remainder : 0));
      });
      return;
    }

    selectedHostesses.forEach((hostessId) => {
      addAmount(hostessId, itemCommission);
    });
  });

  return {
    totalCommission,
    assignedCommission: Array.from(distribution.values()).reduce((acc, item) => acc + item.amount, 0),
    hostessDistribution: Array.from(distribution.values()).sort((a, b) => b.amount - a.amount),
  };
};
