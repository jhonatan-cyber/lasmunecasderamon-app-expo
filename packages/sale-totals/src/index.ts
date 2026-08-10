/**
 * Cálculos puros de la venta: propina y total.
 *
 * ⚠️ ESPEJO de `lib/business/saleTotals.ts` en el dashboard
 * (lasmunecasderamon-dashboard). Dashboard y app son repos independientes con
 * deploys propios (el CI de cada uno hace checkout solo de su repo), así que
 * esta lógica debe vivir en ambos lados. Mantén este archivo IDÉNTICO a
 * `lib/business/saleTotals.ts`; los tests unitarios de cada repo ejercitan los
 * mismos casos para que los flujos de venta (web y móvil) no puedan divergir.
 */

export interface TotalesVentaInput {
  subtotal: number;
  propina: number;
}

/**
 * Propina de venta (`propina_venta`): es el único monto que se REPARTE entre
 * cajeros/garzones activos vía TipRepository. Solo se calcula si el cajero la
 * habilita.
 */
export function calcularPropina(
  subtotal: number,
  propinaPct: number,
  habilitada: boolean
): number {
  return habilitada ? Math.round((subtotal * propinaPct) / 100) : 0;
}

/** Total a pagar por el cliente: subtotal + propina. */
export function calcularTotalVenta({ subtotal, propina }: TotalesVentaInput): number {
  return subtotal + propina;
}
