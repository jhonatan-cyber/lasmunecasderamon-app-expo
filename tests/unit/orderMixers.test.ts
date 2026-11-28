import { describe, expect, it } from "vitest";
import { availableOrderMixers } from "@/hooks/utils/orderMixers";

const bar = [
  { id: "vodka", producto_nombre: "Vodka", nombre: "750 ml", stock_bar: 4 },
  {
    id: "sprite",
    producto_nombre: "Sprite",
    nombre: "500 ml",
    categoria_nombre: "Bebidas analcohólicas",
    stock_bar: 3,
    producto_estado: 1,
    opciones_venta: [
      {
        tipo: "botella",
        cover_habilitado: true,
        corto_anfitriona_habilitado: true,
        colacion_habilitada: true,
      },
    ],
  },
  {
    id: "cola-open",
    producto_nombre: "Coca-Cola",
    nombre: "1 litro",
    categoria_nombre: "Bebidas analcohólicas",
    stock_bar: 0,
    ml_abierta: 350,
    producto_estado: 1,
    opciones_venta: [
      {
        tipo: "botella",
        cover_habilitado: true,
        corto_anfitriona_habilitado: true,
        colacion_habilitada: true,
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
  it("evalúa los ml abiertos por corto de anfitriona, como el dashboard, y excluye el propio producto", () => {
    expect(
      availableOrderMixers(
        bar,
        { ...product, shot_anfitriona: true },
        false,
      ).map((item) => item.id),
    ).toEqual(["sprite", "cola-open"]);
    // Cada corto se elige por unidad: los 350 ml abiertos alcanzan para un
    // corto de 150 ml, aunque la línea tenga 3 unidades.
    expect(
      availableOrderMixers(
        bar,
        { ...product, shot_anfitriona: true, cantidad: 3 },
        false,
      ).map((item) => item.id),
    ).toEqual(["sprite", "cola-open"]);
  });
  it("para cortos de cliente solo ofrece unidades completas suficientes", () => {
    expect(
      availableOrderMixers(bar, product, false).map((item) => item.id),
    ).toEqual(["sprite"]);
    expect(
      availableOrderMixers(bar, { ...product, cantidad: 4 }, false),
    ).toEqual([]);

    const disabledForSale = {
      ...bar[1],
      id: "off-sale-short",
      opciones_venta: [
        { tipo: "botella", en_venta: false, cover_habilitado: true },
      ],
    };
    const disabledForCover = {
      ...bar[1],
      id: "off-cover-short",
      opciones_venta: [
        { tipo: "botella", en_venta: true, cover_habilitado: false },
      ],
    };
    expect(
      availableOrderMixers(
        [...bar, disabledForSale, disabledForCover],
        product,
        false,
      ).map((item) => item.id),
    ).toEqual(["sprite"]);
  });
  it("separa la habilitación de cover cliente de la habilitación de corto anfitriona", () => {
    const enabledForHostess = {
      id: "hostess-only",
      producto_nombre: "Bebida anfitriona",
      nombre: "350 ml",
      categoria_nombre: "Bebidas analcohólicas",
      stock_bar: 5,
      producto_estado: 1,
      opciones_venta: [
        {
          tipo: "botella",
          cover_habilitado: false,
          corto_anfitriona_habilitado: true,
          colacion_habilitada: true,
        },
      ],
    };
    const enabledForClient = {
      id: "cover-only",
      producto_nombre: "Bebida cover",
      nombre: "350 ml",
      stock_bar: 5,
      producto_estado: 1,
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
  it("para corto con anfitriona solo muestra analcohólicas habilitadas para colación", () => {
    const eligible = {
      id: "eligible-meal",
      producto_nombre: "Bebida analcohólica para colación",
      nombre: "350 ml",
      categoria_nombre: "Bebidas analcohólicas",
      stock_bar: 5,
      producto_estado: 1,
      opciones_venta: [
        {
          tipo: "botella",
          corto_anfitriona_habilitado: false,
          colacion_habilitada: true,
        },
      ],
    };
    const notMeal = {
      ...eligible,
      id: "not-meal",
      opciones_venta: [
        {
          tipo: "botella",
          corto_anfitriona_habilitado: true,
          colacion_habilitada: false,
        },
      ],
    };
    const alcoholic = {
      ...eligible,
      id: "alcoholic",
      categoria_nombre: "Bebidas alcohólicas",
    };
    const noCategory = {
      ...eligible,
      id: "no-category",
      categoria_nombre: "",
    };

    expect(
      availableOrderMixers(
        [eligible, notMeal, alcoholic, noCategory],
        { ...product, shot_anfitriona: true },
        false,
      ).map((item) => item.id),
    ).toEqual(["eligible-meal"]);
  });
  it("mantiene los acompañamientos de corto cliente legados sin opciones de venta", () => {
    const legacyMixer = {
      id: "legacy-mixer",
      producto_nombre: "Bebida antigua",
      nombre: "350 ml",
      stock_bar: 5,
      producto_estado: 1,
    };

    expect(
      availableOrderMixers([legacyMixer], product, false).map((item) => item.id),
    ).toEqual(["legacy-mixer"]);
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

  it("usa la misma lista de acompañamientos de botella con o sin anfitriona", () => {
    const bottleBar = [
      ...bar,
      {
        id: "sale-and-cover",
        producto_nombre: "Bebida venta y cover",
        nombre: "500 ml",
        stock_bar: 5,
        producto_estado: 1,
        opciones_venta: [
          { tipo: "botella", en_venta: true, cover_habilitado: true },
        ],
      },
      {
        id: "off-sale",
        producto_nombre: "Bebida fuera de venta",
        nombre: "500 ml",
        stock_bar: 5,
        producto_estado: 1,
        opciones_venta: [
          { tipo: "botella", en_venta: false, cover_habilitado: true },
        ],
      },
      {
        id: "off-cover",
        producto_nombre: "Bebida sin cover cliente",
        nombre: "500 ml",
        stock_bar: 5,
        producto_estado: 1,
        opciones_venta: [
          { tipo: "botella", en_venta: true, cover_habilitado: false },
        ],
      },
      {
        id: "hostess-only",
        producto_nombre: "Bebida solo anfitriona",
        nombre: "500 ml",
        stock_bar: 5,
        producto_estado: 1,
        opciones_venta: [
          { tipo: "botella", vender_con_anfitriona: false, cover_habilitado: true },
        ],
      },
      {
        id: "inactive",
        producto_nombre: "Bebida inactiva",
        nombre: "500 ml",
        stock_bar: 5,
        producto_estado: 0,
      },
    ];
    const hostessBottle = {
      ...product,
      tipo_venta: "botella",
      botella_anfitriona: true,
      cantidad: 1,
    };
    const expected = ["sprite", "sale-and-cover"];

    expect(
      availableOrderMixers(bottleBar, hostessBottle, true).map((item) => item.id),
    ).toEqual(expected);
    expect(
      availableOrderMixers(
        bottleBar,
        { ...hostessBottle, botella_anfitriona: false },
        true,
      ).map((item) => item.id),
    ).toEqual(expected);
  });
});
