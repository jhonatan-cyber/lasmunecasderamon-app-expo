import type { AcompanamientoBotellaItem } from '@/types/cart';
import type { Acompanamiento, Bebida, Formato, OpcionVenta, RepartoInfo } from './types';

/** Normaliza texto para comparar nombres y categorías sin tildes ni mayúsculas. */
export const normalizar = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Analcohólicos y cigarrillos no pueden entregarse como cortesía. */
export function categoriaFueraDeCortesia(categoria: string | null | undefined): boolean {
  const texto = normalizar(categoria || '');
  return texto.includes('analcohol') || texto.includes('cigarr');
}

function opcionesDe(valor: unknown): OpcionVenta[] {
  if (Array.isArray(valor)) return valor as OpcionVenta[];
  if (typeof valor === 'string') {
    try {
      const parseado = JSON.parse(valor);
      return Array.isArray(parseado) ? (parseado as OpcionVenta[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function numero(valor: unknown): number {
  const convertido = Number(valor ?? 0);
  return Number.isFinite(convertido) ? convertido : 0;
}

/** Mapea la fila cruda de `products/for-sale` a una bebida utilizable. */
export function bebidaDe(valor: unknown): Bebida | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = valor as Record<string, unknown>;
  const presentacionId = String(fila.presentacion_id ?? '');
  if (!presentacionId) return null;
  const opciones = opcionesDe(fila.opciones_venta);
  const botella = opciones.find(opcion => opcion.tipo === 'botella');
  const precioSinAnfitriona = numero(botella?.precio_sin_anfitriona);
  return {
    presentacion_id: presentacionId,
    producto_nombre: String(fila.producto_nombre ?? ''),
    presentacion_nombre: String(fila.presentacion_nombre ?? ''),
    precio_venta: numero(fila.precio_venta),
    precio_sin_anfitriona:
      precioSinAnfitriona > 0 ? precioSinAnfitriona : numero(fila.precio_venta),
    stock_bar: numero(fila.stock_bar),
    categoria_nombre:
      typeof fila.categoria_nombre === 'string' && fila.categoria_nombre.trim()
        ? fila.categoria_nombre
        : null,
    opciones_venta: opciones,
  };
}

/** Mapea la fila cruda de `products/for-cover` a un acompañamiento utilizable. */
export function acompanamientoDe(valor: unknown): Acompanamiento | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = valor as Record<string, unknown>;
  const presentacionId = String(fila.presentacion_id ?? '');
  if (!presentacionId) return null;
  return {
    presentacion_id: presentacionId,
    producto_nombre: String(fila.producto_nombre ?? ''),
    presentacion_nombre: String(fila.presentacion_nombre ?? ''),
    stock_bar: numero(fila.stock_bar),
  };
}

function precioCorte(bebida: Bebida): number | null {
  const shot = bebida.opciones_venta.find(opcion => opcion.tipo === 'shot');
  const precio = numero(shot?.precio);
  return precio > 0 ? precio : null;
}

/** Unidades de cover configuradas para la botella de esta bebida. */
function unidadesAcompanamientoBebida(bebida: Bebida): number {
  const botella = bebida.opciones_venta.find(opcion => opcion.tipo === 'botella');
  const unidades = numero(botella?.acompanamiento?.unidades);
  return unidades > 0 ? Math.floor(unidades) : 0;
}

/**
 * Formato de cortesía que cubre el umbral: el corte si su precio entra,
 * si no la botella cuando ambos precios (con y sin anfitriona) entran.
 */
export function formatoCortesia(bebida: Bebida, umbral: number): Formato | null {
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= umbral) return 'corte';

  if (bebida.precio_sin_anfitriona <= umbral && bebida.precio_venta <= umbral) {
    return 'botella';
  }
  return null;
}

export function precioVisible(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? (precioCorte(bebida) ?? 0) : bebida.precio_sin_anfitriona;
}

/** El corte siempre lleva acompañamiento; la botella solo si lo tiene configurado. */
function requiereAcompanamiento(bebida: Bebida, formato: Formato): boolean {
  return formato === 'corte' || unidadesAcompanamientoBebida(bebida) > 0;
}

export const claveDe = (bebida: Bebida, formato: Formato) =>
  `${bebida.presentacion_id}:${formato}`;

/** Unidades de cover que exige una entrega según su formato. */
function unidadesRequeridas(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? 1 : unidadesAcompanamientoBebida(bebida);
}

/** Covers disponibles como acompañamiento (distintos de la bebida y con stock). */
function opcionesCoverPara(
  bebida: Bebida,
  acompanamientos: Acompanamiento[],
): Acompanamiento[] {
  return acompanamientos.filter(
    opcion => opcion.presentacion_id !== bebida.presentacion_id && opcion.stock_bar >= 1,
  );
}

/**
 * Calcula el estado del reparto de acompañamiento de una línea: cuánto exige,
 * cuánto lleva asignado y qué sabores se pueden agregar o subir.
 */
export function calcularReparto(
  bebida: Bebida,
  formato: Formato,
  reparto: AcompanamientoBotellaItem[],
  cantidad: number,
  acompanamientos: Acompanamiento[],
): RepartoInfo {
  const unidades = unidadesRequeridas(bebida, formato);
  const opcionesCover = opcionesCoverPara(bebida, acompanamientos);
  const asignado = reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
  const restante = Math.max(0, unidades - asignado);
  const elegidos = new Set(reparto.map(sabor => sabor.presentacion_id));
  const opcionesParaAgregar = opcionesCover.filter(
    opcion => !elegidos.has(opcion.presentacion_id),
  );
  const lotes = Math.max(1, cantidad);
  const stockDe = (presentacionId: string) =>
    opcionesCover.find(opcion => opcion.presentacion_id === presentacionId)?.stock_bar ?? 0;
  const maxDe = (sabor: AcompanamientoBotellaItem) => {
    const otros = asignado - sabor.unidades;
    return Math.max(
      1,
      Math.min(unidades - otros, Math.floor(stockDe(sabor.presentacion_id) / lotes)),
    );
  };
  const requerido = requiereAcompanamiento(bebida, formato);
  // El corte puede salir sin bebida si no hay cover en el bar; la botella
  // con acompañamiento configurado no: el servidor la exige.
  const falta =
    requerido && (opcionesCover.length === 0 ? formato === 'botella' : asignado !== unidades);

  return {
    requerido,
    unidadesRequeridas: unidades,
    asignado,
    restante,
    opcionesCover,
    opcionesParaAgregar,
    maxDe,
    falta,
  };
}
