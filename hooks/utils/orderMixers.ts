import { matchesProductSearch } from "./productSearch";
import {
  bottleMixerUnits,
  shortMixerConsumption,
} from "./productConfiguration";

export function availableOrderMixers(
  bar: any[],
  item: any,
  bottle: boolean,
  search = "",
) {
  if (!item) return [];
  const quantity = Math.max(1, Number(item.cantidad) || 1);
  if (bottle) {
    // Reparto entre sabores: basta con que el sabor tenga stock para una unidad
    // por botella; el reparto exacto se valida al agregar el producto.
    if (bottleMixerUnits(item) <= 0) return [];
    return bar.filter(
      (product) =>
        String(product.id) !== String(item.presentacion_id) &&
        Number(product.stock_bar || 0) >= quantity &&
        matchesProductSearch(product, search),
    );
  }
  const consumption = shortMixerConsumption(item);
  if (
    Number(
      "ml_por_corto" in consumption
        ? consumption.ml_por_corto
        : consumption.unidades,
    ) <= 0
  )
    return [];
  return bar.filter((product) => {
    if (String(product.id) === String(item.presentacion_id)) return false;
    const stock = Number(product.stock_bar || 0);
    const requiredMl =
      Number("ml_por_corto" in consumption ? consumption.ml_por_corto : 0) *
      quantity;
    const available =
      requiredMl > 0
        ? stock > 0 || Number(product.ml_abierta || 0) >= requiredMl
        : stock > 0 &&
          stock >=
            Number("unidades" in consumption ? consumption.unidades : 0) *
              quantity;
    return available && matchesProductSearch(product, search);
  });
}
