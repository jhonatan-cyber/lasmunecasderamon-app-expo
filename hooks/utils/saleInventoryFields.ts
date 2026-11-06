import type { AcompanamientoBotella } from "@/types/cart";

export interface SaleInventoryFields {
  presentacion_id?: string | null;
  tipo_venta?: "botella" | "shot";
  shot_anfitriona?: boolean;
  botella_anfitriona?: boolean;
  precio_botella_anfitriona?: number;
  precio_botella_sin_anfitriona?: number;
  acompanamiento_botella?: AcompanamientoBotella;
  acompanamiento_corto?: {
    presentacion_id: string;
    unidades?: number;
    ml_por_corto?: number;
    nombre?: string;
  };
}

/** Conserva el consumo al pasar de pedido a cuenta y de cuenta a venta. */
export function saleInventoryFields(
  source: SaleInventoryFields & {
    configuracion_venta?: SaleInventoryFields | string | null;
  },
): SaleInventoryFields {
  let config = source.configuracion_venta;
  if (typeof config === "string") {
    try {
      config = JSON.parse(config);
    } catch {
      config = null;
    }
  }
  const data = typeof config === "object" && config ? config : source;
  return {
    ...(data.presentacion_id ? { presentacion_id: data.presentacion_id } : {}),
    ...(data.tipo_venta ? { tipo_venta: data.tipo_venta } : {}),
    ...(data.shot_anfitriona !== undefined
      ? { shot_anfitriona: data.shot_anfitriona }
      : {}),
    ...(data.botella_anfitriona !== undefined
      ? { botella_anfitriona: data.botella_anfitriona }
      : {}),
    ...(data.precio_botella_anfitriona !== undefined
      ? { precio_botella_anfitriona: data.precio_botella_anfitriona }
      : {}),
    ...(data.precio_botella_sin_anfitriona !== undefined
      ? { precio_botella_sin_anfitriona: data.precio_botella_sin_anfitriona }
      : {}),
    ...(data.acompanamiento_botella ? { acompanamiento_botella: data.acompanamiento_botella } : {}),
    ...(data.acompanamiento_corto
      ? { acompanamiento_corto: data.acompanamiento_corto }
      : {}),
  };
}
