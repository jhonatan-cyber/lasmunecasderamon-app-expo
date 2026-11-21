import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/authStore";
import {
  isChampagneProduct,
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR,
  faltaConfiguracionChampagne,
} from "@/hooks/utils/cartUtils";
import { showToast } from "@/hooks/utils/cartUtils";
import { blockOffline } from "@/utils/offlineGuard";
import { getOutbox } from "@/services/outbox";
import logger from "@/utils/logger";
import {
  requiresShortMixer,
  bottleMixerUnits,
  totalUnidadesAcompanamientoBotella,
} from "@/hooks/utils/productConfiguration";

interface ValidateSaleParams {
  servicioId: string | undefined;
  servicioListo: boolean;
  cajaAbierta: boolean | null;
  cart: any[];
  metodoPago: string | undefined;
  pagosMixtos: any[];
  totals: { total: number };
  selectedCliente: any;
  selectedSegundoCliente: any;
  baucherFoto: string | null | undefined;
  getSaleTiers: (productId: string) => Promise<any[]>;
}

interface PrepagoDestino {
  cliente_id: string;
  monto: number;
}

/**
 * Valida el carrito antes de enviar la venta. Retorna null si pasa,
 * o un string con el mensaje de error.
 */
export async function validateSaleBeforeSubmit({
  servicioId,
  servicioListo,
  cajaAbierta,
  cart,
  metodoPago,
  pagosMixtos,
  totals,
  selectedCliente,
  selectedSegundoCliente,
  baucherFoto,
  getSaleTiers,
}: ValidateSaleParams): Promise<string | null> {
  if (servicioId && (!servicioListo || !blockOffline("servicio")))
    return "Se necesita cargar el servicio activo para registrar esta venta";
  if (cajaAbierta === false) return "Caja cerrada";
  if (cart.length === 0) return "Carrito vacío";

  for (const item of cart) {
    if (item.tipo_venta === "shot" || !isChampagneProduct(item)) continue;
    const tiers = await getSaleTiers(
      String(item.producto_id || item.id_producto || item.id),
    );
    if (faltaConfiguracionChampagne(item.max_anfitrionas, tiers)) {
      return MENSAJE_CHAMPAGNE_SIN_CONFIGURAR;
    }
  }

  if (
    cart.some(
      (p: any) =>
        p.tipo_venta !== "shot" &&
        bottleMixerUnits(p) > 0 &&
        totalUnidadesAcompanamientoBotella(p.acompanamiento_botella) !==
          bottleMixerUnits(p),
    )
  ) {
    return "Reparte el acompañamiento de botella";
  }

  if (
    cart.some(
      (p: any) =>
        requiresShortMixer(p) &&
        (!p.acompanamiento_corto?.presentacion_id ||
          !Number.isInteger(p.acompanamiento_corto.unidades ?? 1) ||
          (p.acompanamiento_corto.unidades ?? 1) < 1),
    )
  ) {
    return "Selecciona soda o gaseosa para entregar completo";
  }

  if (!metodoPago) return "Selecciona un método de pago";

  if (metodoPago === "mixto") {
    const suma = pagosMixtos.reduce((s: number, p: any) => s + p.monto, 0);
    if (Math.abs(suma - totals.total) > 1) {
      return `La suma ($${suma.toLocaleString()}) debe ser igual al total ($${totals.total.toLocaleString()})`;
    }
    if (pagosMixtos.length < 2) {
      return "Selecciona al menos 2 métodos de pago";
    }
  }

  if (metodoPago === "prepago" && !selectedCliente) {
    return "Seleccione un cliente para pagar con prepago";
  }

  if (metodoPago === "transferencia" && !baucherFoto) {
    return "Adjunta la foto del baucher para el pago con transferencia";
  }

  return null;
}

/**
 * Calcula los destinos de prepago para dividir el monto entre clientes.
 */
export function calculatePrepagoDestinos(
  selectedCliente: any,
  selectedSegundoCliente: any,
  total: number,
): { destinos: PrepagoDestino[]; error: string | null } {
  const clientesPrepago = [selectedCliente, selectedSegundoCliente].filter(
    (cliente: any): cliente is NonNullable<typeof cliente> => Boolean(cliente),
  );
  const clientesUnicos = clientesPrepago.filter(
    (cliente: any, index: number, rows: any[]) =>
      index ===
      rows.findIndex(
        (row: any) =>
          String(row.id_cliente ?? row.id) ===
          String(cliente.id_cliente ?? cliente.id),
      ),
  );

  let restante = Math.round(total);
  const mitad = Math.round(restante / 2);
  const destinos: PrepagoDestino[] = [];

  for (const cliente of clientesUnicos) {
    if (restante <= 0) break;
    const saldo = Number(
      cliente.saldo ?? (cliente as any).saldo_prepago ?? 0,
    );
    const monto = clientesUnicos.length === 2
      ? Math.min(saldo, mitad, restante)
      : Math.min(saldo, restante);
    if (monto > 0) {
      destinos.push({
        cliente_id: String(cliente.id_cliente ?? cliente.id),
        monto,
      });
      restante -= monto;
    }
  }

  if (restante > 0) {
    return {
      destinos,
      error:
        "El saldo prepago disponible no cubre el total de la venta",
    };
  }

  return { destinos, error: null };
}

/**
 * Limpia el draft del carrito tras una venta exitosa.
 */
export async function clearCartDraft(
  servicioId: string | undefined,
): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (userId) {
    await AsyncStorage.removeItem(
      `cart-draft:${userId}:sales:${servicioId || "general"}`,
    ).catch(() => {
      logger.debug(
        "No se pudo limpiar el draft del carrito tras venta exitosa.",
      );
    });
  }
}

/**
 * Envía la venta al outbox y maneja el resultado.
 */
export interface SubmitSaleResult {
  status: "aplicada" | "pendiente" | "fallida";
  lastError?: string;
}

export async function enqueueSaleToOutbox(
  payload: any,
  cart: any[],
  totals: { total: number },
): Promise<SubmitSaleResult> {
  const items = cart.reduce(
    (acc: number, item: any) =>
      acc + Number(item.quantity || item.cantidad || 0),
    0,
  );

  const intent = await getOutbox().enqueueAndSend({
    type: "sale.create",
    payload,
    label: `Venta $${Number(totals.total || 0).toLocaleString("es-CL")} · ${items} ítem(s)`,
  });

  return {
    status: intent.status === "fallida" ? "fallida" : intent.status === "aplicada" ? "aplicada" : "pendiente",
    lastError: intent.lastError ?? undefined,
  };
}
