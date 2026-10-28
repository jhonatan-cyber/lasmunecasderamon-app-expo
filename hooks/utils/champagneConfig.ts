import { apiClientSafe } from "@/api/client-safe";
import logger from "@/utils/logger";
import {
  MENSAJE_CHAMPAGNE_SIN_CONFIGURAR,
  faltaConfiguracionChampagne,
  isChampagneProduct,
  showToast,
} from "./cuentaUtils";

export interface ChampagneTierRow {
  anfitrionas: number;
  precio: number;
  comision: number;
}

/**
 * Tramos de precio guardados del producto (`producto_champagne_tiers`).
 *
 * Sin red devuelve `[]`: igual que en la venta, la champaña no se agrega sin
 * poder verificar su configuración (no hay tabla por defecto).
 */
export async function fetchChampagneTiers(
  productoId: string,
): Promise<ChampagneTierRow[]> {
  try {
    const response = await apiClientSafe<any[]>(
      `/products/${encodeURIComponent(productoId)}/tiers?configurados=1`,
    );
    if (!response.success || !Array.isArray(response.data)) return [];
    return response.data
      .map((tier: any) => ({
        anfitrionas: Number(tier.anfitrionas),
        precio: Number(tier.precio),
        comision: Number(tier.comision),
      }))
      .filter(
        (tier) =>
          tier.anfitrionas > 0 && tier.precio >= 0 && tier.comision >= 0,
      )
      .sort((a, b) => a.anfitrionas - b.anfitrionas);
  } catch (error) {
    logger.fetchError(error, { context: "Cuenta:fetchChampagneTiers" });
    return [];
  }
}

/**
 * Rechaza agregar una champaña en botella sin máximo explícito ni tabla de
 * precios por anfitrionas: no tiene cómo cobrarse.
 *
 * Devuelve `true` si la bloqueó (y ya avisó al usuario).
 */
export async function bloqueaChampanaSinConfigurar(
  prod: any,
): Promise<boolean> {
  if (!prod || prod.tipo_venta === "shot" || !isChampagneProduct(prod))
    return false;
  const productoId = String(
    prod.producto_id || prod.id_producto || prod.id || "",
  );
  if (!productoId || Number(prod.max_anfitrionas) > 0) return false;
  const tiers = await fetchChampagneTiers(productoId);
  if (!faltaConfiguracionChampagne(prod.max_anfitrionas, tiers)) return false;
  showToast("Champaña sin configurar", MENSAJE_CHAMPAGNE_SIN_CONFIGURAR);
  return true;
}
