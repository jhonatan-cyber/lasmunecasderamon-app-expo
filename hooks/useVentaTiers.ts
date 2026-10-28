import { useCallback, useRef } from 'react';
import { apiClientSafe } from '@/api/client';
import logger from '@/utils/logger';

export interface SaleTier {
  anfitrionas: number;
  precio: number;
  comision: number;
}

/**
 * Catálogo de precios por cantidad de anfitrionas. Se cachea en memoria porque
 * un mismo producto se consulta varias veces durante una venta (selector,
 * carrito y confirmación).
 */
export function useVentaTiers() {
  const saleTiersCache = useRef<Map<string, SaleTier[]>>(new Map());

  const getSaleTiers = useCallback(
    async (productId: string): Promise<SaleTier[]> => {
      const cached = saleTiersCache.current.get(productId);
      if (cached) return cached;
      try {
        const response = await apiClientSafe(
          `/products/${encodeURIComponent(productId)}/tiers?configurados=1`,
        );
        const tiers: SaleTier[] =
          (response as any)?.success && Array.isArray((response as any).data)
            ? (response as any).data
                .map((tier: any) => ({
                  anfitrionas: Number(tier.anfitrionas),
                  precio: Number(tier.precio),
                  comision: Number(tier.comision),
                }))
                .filter(
                  (tier: SaleTier) =>
                    tier.anfitrionas > 0 &&
                    tier.precio >= 0 &&
                    tier.comision >= 0,
                )
                .sort((a: SaleTier, b: SaleTier) => a.anfitrionas - b.anfitrionas)
            : [];
        saleTiersCache.current.set(productId, tiers);
        return tiers;
      } catch (error) {
        logger.fetchError(error, { context: 'NuevaVenta:getSaleTiers' });
        return [];
      }
    },
    [],
  );

  return { getSaleTiers };
}
