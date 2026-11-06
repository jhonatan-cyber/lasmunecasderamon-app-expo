import { parseOpcionesVenta } from "./saleChoice";
import type {
  AcompanamientoBotella,
  AcompanamientoBotellaItem,
} from "@/types/cart";
export function hostessMixerMl(product: any): number {
  return product.shot_anfitriona ? Number((parseOpcionesVenta(product.opciones_venta) ?? [])
    .find((option: any) => option.tipo === 'shot')?.ml_acompanamiento_anfitriona ?? 0) : 0;
}
export function shortMixerConsumption(product: any): { unidades: number } | { ml_por_corto: number } {
  return product.shot_anfitriona ? { ml_por_corto: hostessMixerMl(product) } : { unidades: 1 };
}

export function clienteShortSinAcompanamiento(product: any): boolean {
  if (product.shot_anfitriona || product.tipo_venta !== "shot") return false;
  const shot = (parseOpcionesVenta(product.opciones_venta) ?? [])
    .find((option: any) => option.tipo === "shot");
  return shot?.acompanamiento_cliente === false;
}
export function requiresShortMixer(product: any): boolean {
  return (
    product.tipo_venta === "shot" &&
    !clienteShortSinAcompanamiento(product) &&
    (!product.shot_anfitriona || hostessMixerMl(product) > 0)
  );
}
export function bottleMixerUnits(product: any): number {
  return Number((parseOpcionesVenta(product.opciones_venta) ?? [])
    .find((option: any) => option.tipo === 'botella')?.acompanamiento?.unidades ?? 0);
}

export function normalizarAcompanamientoBotella(
  value: AcompanamientoBotella | null | undefined,
): AcompanamientoBotellaItem[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .filter(
      (item) =>
        item && item.presentacion_id && Number.isFinite(Number(item.unidades)),
    )
    .map((item) => ({
      presentacion_id: String(item.presentacion_id),
      unidades: Math.floor(Number(item.unidades)),
      ...(item.nombre !== undefined ? { nombre: item.nombre } : {}),
      ...(item.foto !== undefined ? { foto: item.foto } : {}),
    }));
}
export function totalUnidadesAcompanamientoBotella(
  value: AcompanamientoBotella | null | undefined,
): number {
  return normalizarAcompanamientoBotella(value).reduce(
    (sum, item) => sum + item.unidades,
    0,
  );
}
