import { parseOpcionesVenta } from "./saleChoice";
export function hostessMixerMl(product: any): number {
  return product.shot_anfitriona ? Number((parseOpcionesVenta(product.opciones_venta) ?? [])
    .find((option: any) => option.tipo === 'shot')?.ml_acompanamiento_anfitriona ?? 0) : 0;
}
export function shortMixerConsumption(product: any): { unidades: number } | { ml_por_corto: number } {
  return product.shot_anfitriona ? { ml_por_corto: hostessMixerMl(product) } : { unidades: 1 };
}
export function requiresShortMixer(product: any): boolean {
  return product.tipo_venta === 'shot' && (!product.shot_anfitriona || hostessMixerMl(product) > 0);
}
export function bottleMixerUnits(product: any): number {
  return Number((parseOpcionesVenta(product.opciones_venta) ?? [])
    .find((option: any) => option.tipo === 'botella')?.acompanamiento?.unidades ?? 0);
}
