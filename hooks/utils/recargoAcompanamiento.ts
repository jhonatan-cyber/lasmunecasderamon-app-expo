import { normalizarAcompanamientoBotella } from "@/hooks/utils/productConfiguration";
import type { AcompanamientoBotella } from "@/types/cart";

export interface RecargoAcompanamientoInput {
  tope: number;
  tipoVenta?: "botella" | "shot" | string | null;
  acompanamiento_botella?: AcompanamientoBotella | null;
  acompanamiento_corto?: {
    precio?: number;
    unidades?: number;
    ml_por_corto?: number;
  } | null;
}

const excesoPorUnidad = (precio: unknown, tope: number): number => {
  const valor = Number(precio);
  return Number.isFinite(valor) ? Math.max(0, Math.round(valor) - tope) : 0;
};

/**
 * Exceso por unidad vendida sobre el tope de precio del acompañamiento
 * (`comisiones.tope_precio_acompañamiento`). Los cortos de anfitriona consumen
 * ml de la botella y no llevan recargo; `tope <= 0` desactiva la regla.
 */
export function recargoAcompanamientoPorUnidad({
  tope,
  tipoVenta,
  acompanamiento_botella,
  acompanamiento_corto,
}: RecargoAcompanamientoInput): number {
  const limite = Math.round(Number(tope));
  if (!Number.isFinite(limite) || limite <= 0) return 0;

  if (tipoVenta === "shot") {
    if (
      !acompanamiento_corto ||
      acompanamiento_corto.ml_por_corto !== undefined
    )
      return 0;
    const unidades = Math.max(
      0,
      Math.floor(Number(acompanamiento_corto.unidades ?? 1)),
    );
    return excesoPorUnidad(acompanamiento_corto.precio, limite) * unidades;
  }

  return normalizarAcompanamientoBotella(acompanamiento_botella).reduce(
    (suma, item) => suma + excesoPorUnidad(item.precio, limite) * item.unidades,
    0,
  );
}

/** Recargo por unidad del producto tal como se armó en el modal o el carrito. */
export function recargoAcompanamientoDeProducto(
  producto:
    | {
        tipo_venta?: string | null;
        acompanamiento_botella?: AcompanamientoBotella | null;
        acompanamiento_corto?: RecargoAcompanamientoInput["acompanamiento_corto"];
      }
    | null
    | undefined,
  tope: number,
): number {
  return recargoAcompanamientoPorUnidad({
    tope,
    tipoVenta: producto?.tipo_venta,
    acompanamiento_botella: producto?.acompanamiento_botella,
    acompanamiento_corto: producto?.acompanamiento_corto,
  });
}
