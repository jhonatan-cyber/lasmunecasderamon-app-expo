import { describe, expect, it } from "vitest";
import { availableOrderMixers } from "@/hooks/utils/orderMixers";

const bar = [
  { id: "vodka", producto_nombre: "Vodka", nombre: "750 ml", stock_bar: 4 },
  { id: "sprite", producto_nombre: "Sprite", nombre: "500 ml", stock_bar: 3 },
  {
    id: "cola-open",
    producto_nombre: "Coca-Cola",
    nombre: "1 litro",
    stock_bar: 0,
    ml_abierta: 350,
  },
  {
    id: "empty",
    producto_nombre: "Sprite",
    nombre: "Sin stock",
    stock_bar: 0,
    ml_abierta: 0,
  },
];
const product = {
  presentacion_id: "vodka",
  tipo_venta: "shot",
  cantidad: 2,
  opciones_venta: [
    { tipo: "shot", ml_acompanamiento_anfitriona: 150 },
    { tipo: "botella", acompanamiento: { unidades: 2 } },
  ],
};

describe("Bebidas del pedido", () => {
  it("permite ml abiertos suficientes para cortos de anfitriona y excluye el propio producto", () => {
    expect(
      availableOrderMixers(
        bar,
        { ...product, shot_anfitriona: true },
        false,
      ).map((item) => item.id),
    ).toEqual(["sprite", "cola-open"]);
    expect(
      availableOrderMixers(
        bar,
        { ...product, shot_anfitriona: true, cantidad: 3 },
        false,
      ).map((item) => item.id),
    ).toEqual(["sprite"]);
  });
  it("para cortos de cliente solo ofrece unidades completas suficientes", () => {
    expect(
      availableOrderMixers(bar, product, false).map((item) => item.id),
    ).toEqual(["sprite"]);
    expect(
      availableOrderMixers(bar, { ...product, cantidad: 4 }, false),
    ).toEqual([]);
  });
  it("para botellas usa las unidades configuradas y permite buscar", () => {
    expect(
      availableOrderMixers(
        bar,
        { ...product, tipo_venta: "botella", cantidad: 1 },
        true,
        "sprite",
      ).map((item) => item.id),
    ).toEqual(["sprite"]);
    expect(availableOrderMixers(bar, product, true)).toEqual([]);
  });
});
