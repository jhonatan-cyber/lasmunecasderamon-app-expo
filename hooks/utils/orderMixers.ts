import { matchesProductSearch } from "./productSearch";
import {
  bottleMixerUnits,
  shortMixerConsumption,
} from "./productConfiguration";
import { parseOpcionesVenta } from "./saleChoice";

function enabledForSaleAndCover(product: any) {
  const options = parseOpcionesVenta(product.opciones_venta);
  if (options.length === 0) return true;
  const bottleOption = options.find((option) => option.tipo === "botella");
  if (!bottleOption) return false;
  const enabledForSale =
    bottleOption.en_venta !== false &&
    (bottleOption.en_venta === true ||
      bottleOption.vender_con_anfitriona !== false);
  return enabledForSale && bottleOption.cover_habilitado !== false;
}

function hasNonAlcoholicCategory(product: any) {
  const category = String(
    product.categoria_nombre ??
      product.categoria ??
      product.category_name ??
      "",
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return category.includes("analcohol");
}

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
    return bar.filter((product) => {
      if (String(product.id) === String(item.presentacion_id)) return false;
      if (Number(product.producto_estado ?? 1) !== 1) return false;
      if (!enabledForSaleAndCover(product)) return false;

      return (
        Number(product.stock_bar || 0) >= quantity &&
        matchesProductSearch(product, search)
      );
    });
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
    if (Number(product.producto_estado ?? 1) !== 1) return false;
    const bottleOption = parseOpcionesVenta(product.opciones_venta).find(
      (option) => option.tipo === "botella",
    );
    if (item.shot_anfitriona) {
      if (
        !hasNonAlcoholicCategory(product) ||
        bottleOption?.colacion_habilitada !== true
      )
        return false;
    } else {
      if (!enabledForSaleAndCover(product)) return false;
    }
    const stock = Number(product.stock_bar || 0);
    if (item.shot_anfitriona) {
      // El dashboard evalúa la bebida para cada corto por unidad: alcanza con
      // los ml de un corto (o con stock sellado, que el servidor abre).
      const requiredMl = Number(
        "ml_por_corto" in consumption ? consumption.ml_por_corto : 0,
      );
      const available =
        stock > 0 ||
        (requiredMl > 0 && Number(product.ml_abierta || 0) >= requiredMl);
      return available && matchesProductSearch(product, search);
    }
    const available =
      stock > 0 &&
      stock >=
        Number("unidades" in consumption ? consumption.unidades : 0) *
          quantity;
    return available && matchesProductSearch(product, search);
  });
}
