import {
  preciosCortoAnfitriona,
  esCortoAnfitriona,
} from "./hostessShortPrices";
// Qué formas de venta ofrece una presentación del bar y qué precio y comisión lleva cada
// una. Lo comparten el modal de productos (venta por categoría) y el buscador rápido: antes
// cada uno resolvía la regla por su cuenta, y el buscador se quedaba solo con la botella.
import type { SaleOption, SaleType } from "@/types/sale-options";
export type { SaleOption } from "@/types/sale-options";
export function parseOpcionesVenta(raw: unknown): SaleOption[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Forma de venta elegida: botella entera o shot, a precio de cliente o de anfitriona. */
export type SaleChoice =
  SaleType | "botella_sin_anfitriona" | "shot_anfitriona" | `shot_anfitriona:${number}`;

export const esBotella = (value: string) =>
  value === "botella" || value === "botella_sin_anfitriona";

/**
 * 'Botella · 2 gaseosas' solo si la botella lleva acompañamiento; con 0
 * unidades —o sin acompañamiento configurado— la etiqueta es solo 'Botella'.
 */
function nombreBotella(
  acompanamiento?: SaleOption["acompanamiento"],
): string {
  const unidades = Number(acompanamiento?.unidades ?? 0);
  if (unidades <= 0) return "Botella";
  const tipo = acompanamiento?.tipo
    ? acompanamiento.tipo === "gaseosa"
      ? "gaseosas"
      : "sodas"
    : "acompañamientos";
  return `Botella · ${unidades} ${tipo}`;
}

export interface OpcionVentaProducto {
  value: SaleChoice;
  /** Nombre sin precio: 'Botella', 'Shot' (o 'Shot cliente') y 'Shot anfitriona'. */
  nombre: string;
  precio: number;
  comision: number;
  esShot: boolean;
}

export interface VentaProductoResuelta {
  opciones: OpcionVentaProducto[];
  /** La presentación tiene precio de shot: se puede vender por ml. */
  tieneShot: boolean;
  /** Hay precio de anfitriona: quien vende elige a quién le cobra el shot. */
  tieneShotAnfitriona: boolean;
  /** Elección normalizada contra lo que el producto realmente ofrece. */
  tipoVenta: SaleChoice;
  esShot: boolean;
  precio: number;
  comision: number;
  /** Precio y comisión de la botella entera (la regla de anfitriona mira este precio). */
  precioBotella: number;
  comisionBotella: number;
  /** Tope de unidades: el shot sale de la botella abierta, así que no gasta botellas. */
  maxCantidad: number;
}

/**
 * Resuelve las opciones de venta de una presentación. `eleccion` es lo que eligió quien
 * vende; si el producto no ofrece esa forma (sin precio de anfitriona, sin shot), cae a la
 * más parecida en vez de romper.
 */
export function resolverVentaProducto(
  producto: any,
  eleccion?: SaleChoice,
): VentaProductoResuelta {
  // `opciones_venta` puede venir como array o como el JSON que guarda
  // Configuraciones; sin parsear, el selector desaparecería del todo.
  const opcionesVenta: SaleOption[] =
    parseOpcionesVenta(producto?.opciones_venta) ?? [];
  const opcionShot = opcionesVenta.find((opcion) => opcion.tipo === "shot");
  const opcionBotella = opcionesVenta.find(
    (opcion) => opcion.tipo === "botella",
  );

  const precioBotella = Number(
    opcionBotella?.precio ?? producto?.precio ?? producto?.price ?? 0,
  );
  const comisionBotella = Number(
    opcionBotella?.comision ?? producto?.comision ?? producto?.commission ?? 0,
  );
  const precioShotCliente = Number(opcionShot?.precio ?? 0);
  const preciosAnfitriona = preciosCortoAnfitriona(opcionShot);
  const tieneShotCliente = Boolean(opcionShot && precioShotCliente > 0);
  const tieneShotAnfitriona = preciosAnfitriona.length > 0;
  const tieneShot = tieneShotCliente || tieneShotAnfitriona;
  const botellaHabilitada =
    opcionBotella?.en_venta !== false &&
    (opcionBotella?.en_venta === true || opcionBotella?.vender_con_anfitriona !== false) &&
    precioBotella > 0;

  const opciones: OpcionVentaProducto[] = [
    ...(botellaHabilitada && (opcionBotella || !tieneShot)
      ? [{
          value: "botella" as SaleChoice,
          nombre: nombreBotella(opcionBotella?.acompanamiento),
          precio: precioBotella,
          comision: comisionBotella,
          esShot: false,
        }]
      : []),
    ...(opcionBotella?.en_venta !== false && Number(opcionBotella?.precio_sin_anfitriona) > 0
      ? [{
          value: "botella_sin_anfitriona" as SaleChoice,
          nombre: "Botella sin anfitriona",
          precio: Number(opcionBotella!.precio_sin_anfitriona),
          comision: 0,
          esShot: false,
        }]
      : []),
    ...(tieneShotCliente
      ? [
          {
            value: "shot" as SaleChoice,
            nombre: tieneShotAnfitriona ? "Corto cliente" : "Corto",
            precio: precioShotCliente,
            comision: 0,
            esShot: true,
          },
        ]
      : []),
    ...(tieneShotAnfitriona
      ? [
          ...preciosAnfitriona.map((row, index) => ({
            value: (index === 0
              ? "shot_anfitriona"
              : `shot_anfitriona:${index}`) as SaleChoice,
            nombre:
              preciosAnfitriona.length > 1
                ? `Corto anfitriona · $${row.precio.toLocaleString("es-CL")}`
                : "Corto anfitriona",
            precio: row.precio,
            comision: row.comision,
            esShot: true,
          })),
        ]
      : []),
  ];

  const tipoVenta: SaleChoice =
    eleccion &&
    (esCortoAnfitriona(eleccion) || eleccion === "botella_sin_anfitriona") &&
    opciones.some((option) => option.value === eleccion)
      ? eleccion
      : (eleccion === "shot" || (eleccion && esCortoAnfitriona(eleccion))) &&
          tieneShotCliente
        ? "shot"
        : (opciones[0]?.value ?? "botella");

  const elegida =
    opciones.find((opcion) => opcion.value === tipoVenta) ?? opciones[0] ?? null;
  const maxCantidad = elegida?.esShot ? 99 : Number(producto?.stock_bar ?? 0);

  return {
    opciones,
    tieneShot,
    tieneShotAnfitriona,
    tipoVenta,
    esShot: Boolean(elegida?.esShot),
    precio: elegida?.precio ?? 0,
    comision: elegida?.comision ?? 0,
    precioBotella,
    comisionBotella,
    maxCantidad,
  };
}

/** Etiqueta corta de una línea del carrito para saber cómo se vendió. */
export function etiquetaTipoVenta(item: {
  tipo_venta?: string;
  shot_anfitriona?: boolean;
}): string | null {
  if (item?.tipo_venta !== "shot") return null;
  return item?.shot_anfitriona ? "Corto anfitriona" : "Corto cliente";
}

/**
 * Etiqueta de una opción en listados de traspaso: la botella con anfitriona
 * se nombra así cuando la misma presentación también ofrece la botella sin
 * anfitriona, para que ambas se distingan.
 */
export function etiquetaOpcionVenta(
  opcion: OpcionVentaProducto,
  opciones: OpcionVentaProducto[],
): string {
  if (opcion.value !== "botella") return opcion.nombre;
  return opciones.some((otra) => otra.value === "botella_sin_anfitriona")
    ? opcion.nombre.replace(/^Botella/, "Botella con anfitriona")
    : opcion.nombre;
}

export interface PrecioOpcionVenta {
  label: string;
  precio: number;
  comision: number;
}

/**
 * Precios de un traspaso tal como quedaron configurados, una fila por forma de
 * venta: botella con/sin anfitriona y corto de cliente o de anfitriona. El
 * historial no debe mostrar un "$0" de comisión ni esconder un precio solo
 * porque el movimiento guarda uno de los dos.
 */
export function preciosOpcionesVenta(raw: unknown): PrecioOpcionVenta[] {
  const filas: PrecioOpcionVenta[] = [];
  for (const option of parseOpcionesVenta(raw)) {
    if (option.en_venta === false) continue;
    if (option.tipo === "botella") {
      const sinAnfitriona = Number(option.precio_sin_anfitriona ?? 0);
      const precio =
        option.vender_con_anfitriona === false ? 0 : Number(option.precio ?? 0);
      if (precio > 0) {
        filas.push({
          label: sinAnfitriona > 0 ? "Con anfitriona" : "Botella",
          precio,
          comision: Number(option.comision ?? 0),
        });
      }
      if (sinAnfitriona > 0) {
        filas.push({
          label: "Botella sin anfitriona",
          precio: sinAnfitriona,
          comision: 0,
        });
      }
      continue;
    }
    const anfitrionas = preciosCortoAnfitriona(option);
    const precioCliente = Number(option.precio ?? 0);
    if (precioCliente > 0) {
      filas.push({
        label: anfitrionas.length > 0 ? "Corto cliente" : "Corto",
        precio: precioCliente,
        comision: 0,
      });
    }
    anfitrionas.forEach((row, index) => {
      filas.push({
        label:
          anfitrionas.length > 1
            ? `Corto anfitriona ${index + 1}`
            : "Corto anfitriona",
        precio: Number(row.precio ?? 0),
        comision: Number(row.comision ?? 0),
      });
    });
  }
  return filas;
}
