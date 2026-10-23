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
  const consumption = bottle
    ? { unidades: bottleMixerUnits(item) }
    : shortMixerConsumption(item);
  if (
    Number(
      "ml_por_corto" in consumption
        ? consumption.ml_por_corto
        : consumption.unidades,
    ) <= 0
  )
    return [];
  const quantity = Math.max(1, Number(item.cantidad) || 1);
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
