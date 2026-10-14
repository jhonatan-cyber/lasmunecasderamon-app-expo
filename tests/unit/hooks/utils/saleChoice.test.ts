import { describe, expect, it } from "vitest";

import {
  etiquetaTipoVenta,
  parseOpcionesVenta,
  resolverVentaProducto,
} from "@/hooks/utils/saleChoice";

const conCortoYAnfitriona = {
  precio: 180000,
  comision: 5000,
  stock_bar: 6,
  opciones_venta: [
    { tipo: "botella", precio: 180000, comision: 5000 },
    { tipo: "shot", precio: 15000, comision: 1000, precio_anfitriona: 8000 },
  ],
};

const soloCorto = {
  precio: 90000,
  comision: 0,
  stock_bar: 3,
  opciones_venta: [{ tipo: "shot", precio: 12000, comision: 0 }],
};

const soloBotella = {
  precio: 5000,
  comision: 0,
  stock_bar: 12,
};

describe("parseOpcionesVenta", () => {
  it("acepta el array tal cual", () => {
    const opciones = [{ tipo: "shot", precio: 100, comision: 0 }];
    expect(parseOpcionesVenta(opciones)).toEqual(opciones);
  });

  it("acepta el JSON guardado por Configuraciones", () => {
    const opciones = [
      { tipo: "shot", precio: 100, comision: 0, precio_anfitriona: 50 },
    ];
    expect(parseOpcionesVenta(JSON.stringify(opciones))).toEqual(opciones);
  });

  it("sin opciones o con JSON inválido devuelve lista vacía", () => {
    expect(parseOpcionesVenta(undefined)).toEqual([]);
    expect(parseOpcionesVenta("no-es-json")).toEqual([]);
    expect(parseOpcionesVenta('{"tipo":"shot"}')).toEqual([]);
  });
});

describe("resolverVentaProducto", () => {
  it("solo con botella ofrece una opción y vende a precio de botella", () => {
    const venta = resolverVentaProducto(soloBotella);

    expect(venta.opciones).toHaveLength(1);
    expect(venta.opciones[0].value).toBe("botella");
    expect(venta.tieneShot).toBe(false);
    expect(venta.tieneShotAnfitriona).toBe(false);
    expect(venta.tipoVenta).toBe("botella");
    expect(venta.precio).toBe(5000);
    expect(venta.comision).toBe(0);
  });

  it("con shot ofrece Botella, Corto cliente y Corto anfitriona", () => {
    const venta = resolverVentaProducto(conCortoYAnfitriona);

    expect(venta.opciones.map((opcion) => opcion.value)).toEqual([
      "botella",
      "shot",
      "shot_anfitriona",
    ]);
    expect(venta.opciones.map((opcion) => opcion.nombre)).toEqual([
      "Botella",
      "Corto cliente",
      "Corto anfitriona",
    ]);
    expect(venta.tieneShot).toBe(true);
    expect(venta.tieneShotAnfitriona).toBe(true);
    // Por defecto se vende botella, como siempre.
    expect(venta.tipoVenta).toBe("botella");
    expect(venta.precio).toBe(180000);
  });

  it("elige el shot de anfitriona con su precio y su comisión", () => {
    const venta = resolverVentaProducto(conCortoYAnfitriona, "shot_anfitriona");

    expect(venta.tipoVenta).toBe("shot_anfitriona");
    expect(venta.esShot).toBe(true);
    expect(venta.precio).toBe(8000);
    expect(venta.comision).toBe(1000);
  });

  it("elige el shot de cliente con su precio", () => {
    const venta = resolverVentaProducto(conCortoYAnfitriona, "shot");

    expect(venta.tipoVenta).toBe("shot");
    expect(venta.precio).toBe(15000);
    expect(venta.comision).toBe(0);
  });

  it("sin precio de anfitriona la elección cae a shot de cliente", () => {
    const venta = resolverVentaProducto(soloCorto, "shot_anfitriona");

    expect(venta.tipoVenta).toBe("shot");
    expect(venta.tieneShotAnfitriona).toBe(false);
    expect(venta.opciones.map((opcion) => opcion.value)).toEqual(["shot"]);
  });

  it("sin shot la elección cae a botella en vez de romper", () => {
    const venta = resolverVentaProducto(soloBotella, "shot");

    expect(venta.tipoVenta).toBe("botella");
    expect(venta.precio).toBe(5000);
  });

  it("las opciones llegan también como string JSON", () => {
    const venta = resolverVentaProducto({
      ...conCortoYAnfitriona,
      opciones_venta: JSON.stringify(conCortoYAnfitriona.opciones_venta),
    });

    expect(venta.tieneShot).toBe(true);
    expect(venta.tieneShotAnfitriona).toBe(true);
  });

  it("el shot no gasta botellas: tope 99; la botella usa stock del bar", () => {
    expect(resolverVentaProducto(conCortoYAnfitriona, "shot").maxCantidad).toBe(
      99,
    );
    expect(
      resolverVentaProducto(conCortoYAnfitriona, "shot_anfitriona").maxCantidad,
    ).toBe(99);
    expect(
      resolverVentaProducto(conCortoYAnfitriona, "botella").maxCantidad,
    ).toBe(6);
    // Catálogo legacy sin stock: sin tope (0), como en el dashboard.
    expect(
      resolverVentaProducto({ ...soloBotella, stock_bar: 0 }).maxCantidad,
    ).toBe(0);
  });

  it("la comisión de la botella no la hereda el shot", () => {
    const venta = resolverVentaProducto(conCortoYAnfitriona, "shot");

    expect(venta.comisionBotella).toBe(5000);
    expect(venta.comision).toBe(0);
  });
});

describe("etiquetaTipoVenta", () => {
  it("etiqueta las líneas de shot y calla las de botella", () => {
    expect(
      etiquetaTipoVenta({ tipo_venta: "shot", shot_anfitriona: true }),
    ).toBe("Corto anfitriona");
    expect(
      etiquetaTipoVenta({ tipo_venta: "shot", shot_anfitriona: false }),
    ).toBe("Corto cliente");
    expect(etiquetaTipoVenta({ tipo_venta: "botella" })).toBeNull();
    expect(etiquetaTipoVenta({})).toBeNull();
  });
});

it("resuelve cada precio de anfitriona con su propia comision y cliente sin comision", () => {
  const p = {
    opciones_venta: [
      {
        tipo: "shot",
        precio: 15000,
        comision: 999,
        precios_anfitriona: [
          { precio: 8000, comision: 1000 },
          { precio: 10000, comision: 2000 },
        ],
      },
    ],
  };
  const choices = resolverVentaProducto(p).opciones.filter((o) =>
    o.value.startsWith("shot_anfitriona"),
  );
  expect(choices.map((o) => [o.precio, o.comision])).toEqual([
    [8000, 1000],
    [10000, 2000],
  ]);
  expect(resolverVentaProducto(p, choices[1].value).comision).toBe(2000);
  expect(resolverVentaProducto(p, "shot").comision).toBe(0);
});
