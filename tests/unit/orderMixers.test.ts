import { describe, expect, it } from "vitest";
import { availableOrderMixers } from "@/hooks/utils/orderMixers";

const bar = [
  { id: "vodka", producto_nombre: "Vodka", nombre: "750 ml", stock_bar: 4 },
  {
    id: "sprite",
    producto_nombre: "Sprite",
    nombre: "500 ml",
    stock_bar: 3,
    opciones_venta: [
      {
        tipo: "botella",
        cover_habilitado: true,
        corto_anfitriona_habilitado: true,
      },
    ],
  },
  {
    id: "cola-open",
    producto_nombre: "Coca-Cola",
    nombre: "1 litro",
    stock_bar: 0,
    ml_abierta: 350,
    opciones_venta: [
      {
        tipo: "botella",
        cover_habilitado: true,
        corto_anfitriona_habilitado: true,
      },
    ],
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
  it("separa la habilitación de cover cliente de la habilitación de corto anfitriona", () => {
    const enabledForHostess = {
      id: "hostess-only",
      producto_nombre: "Bebida anfitriona",
      nombre: "350 ml",
      stock_bar: 5,
      opciones_venta: [
        {
          tipo: "botella",
          cover_habilitado: false,
          corto_anfitriona_habilitado: true,
        },
      ],
    };
    const enabledForClient = {
      id: "cover-only",
      producto_nombre: "Bebida cover",
      nombre: "350 ml",
      stock_bar: 5,
      opciones_venta: [
        {
          tipo: "botella",
          cover_habilitado: true,
          corto_anfitriona_habilitado: false,
        },
      ],
    };
    const choices = [enabledForHostess, enabledForClient];

    expect(
      availableOrderMixers(
        choices,
        { ...product, shot_anfitriona: true },
        false,
      ).map((item) => item.id),
    ).toEqual(["hostess-only"]);
    expect(
      availableOrderMixers(choices, product, false).map((item) => item.id),
    ).toEqual(["cover-only"]);
  });
  it("para botellas ofrece sabores con al menos una unidad por botella", () => {
    expect(
      availableOrderMixers(
        bar,
        { ...product, tipo_venta: "botella", cantidad: 1 },
        true,
        "sprite",
      ).map((item) => item.id),
    ).toEqual(["sprite"]);
    expect(
      availableOrderMixers(
        bar,
        { ...product, tipo_venta: "botella", cantidad: 2 },
        true,
      ).map((item) => item.id),
    ).toEqual(["sprite"]);
  });
});
