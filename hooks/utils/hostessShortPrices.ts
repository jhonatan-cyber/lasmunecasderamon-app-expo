import type { SaleOption } from "@/types/sale-options";

export function preciosCortoAnfitriona(option?: SaleOption) {
  if (!option || option.tipo !== "shot") return [];
  if (Array.isArray(option.precios_anfitriona))
    return option.precios_anfitriona;
  const precio = Number(option.precio_anfitriona ?? 0);
  return precio > 0 ? [{ precio, comision: Number(option.comision ?? 0) }] : [];
}

export const esCortoAnfitriona = (value: string) =>
  value === "shot_anfitriona" || value.startsWith("shot_anfitriona:");
