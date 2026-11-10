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
export function categoriaFueraDeCover(categoria: string | null | undefined): boolean {
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
 * Formatos que entran en el presupuesto del grupo (entradas + monto adicional).
 *
 * El corte se lista cuando el precio del shot entra completo. La botella se
 * lista cuando su precio sin anfitriona entra; si queda sobre el umbral se
 * cobra la diferencia en la barra, y si entra como cover el servidor además
 * exige que el precio de venta no supere el umbral.
 */
export function formatosCover(
  bebida: Bebida,
  presupuesto: number,
  umbral: number,
): Formato[] {
  const formatos: Formato[] = [];
  const corte = precioCorte(bebida);
  if (corte !== null && corte <= presupuesto) formatos.push('corte');

  const precioBotella = bebida.precio_sin_anfitriona;
  if (
    precioBotella <= presupuesto &&
    (precioBotella > umbral || bebida.precio_venta <= umbral)
  ) {
    formatos.push('botella');
  }
  return formatos;
}

export function precioVisible(bebida: Bebida, formato: Formato): number {
  return formato === 'corte' ? (precioCorte(bebida) ?? 0) : bebida.precio_sin_anfitriona;
}

/**
 * Diferencia que se cobra en la barra por una entrega, con la misma regla del
 * servidor: sobre `max(tope, monto_entrada)` se paga el precio menos la entrada.
 */
export function montoCobroBarra(precio: number, montoEntrada: number, tope: number): number {
  const umbral = Math.max(tope, montoEntrada);
  return precio > umbral ? Math.max(0, precio - montoEntrada) : 0;
}

/** El corte siempre lleva acompañamiento; la botella solo si lo tiene configurado. */
export function requiereAcompanamiento(bebida: Bebida, formato: Formato): boolean {
  return formato === 'corte' || unidadesAcompanamientoBebida(bebida) > 0;
}

export const claveDe = (bebida: Bebida, formato: Formato) =>
  `${bebida.presentacion_id}:${formato}`;

/** Unidades de cover que exige cada entrega según su formato. */
export function unidadesPorEntrega(bebida: Bebida, formato: Formato): number {
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
 * Calcula el estado del reparto de acompañamiento de una línea: cuánto exige
 * entre todas sus entregas, cuánto lleva asignado y qué sabores se pueden
 * agregar o subir.
 */
export function calcularReparto(
  bebida: Bebida,
  formato: Formato,
  reparto: AcompanamientoBotellaItem[],
  cantidad: number,
  acompanamientos: Acompanamiento[],
): RepartoInfo {
  const entregas = Math.max(1, cantidad);
  const porEntrega = unidadesPorEntrega(bebida, formato);
  const unidades = porEntrega * entregas;
  const opcionesCover = opcionesCoverPara(bebida, acompanamientos);
  const asignado = reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
  const restante = Math.max(0, unidades - asignado);
  const elegidos = new Set(reparto.map(sabor => sabor.presentacion_id));
  const opcionesParaAgregar = opcionesCover.filter(
    opcion => !elegidos.has(opcion.presentacion_id),
  );
  const stockDe = (presentacionId: string) =>
    opcionesCover.find(opcion => opcion.presentacion_id === presentacionId)?.stock_bar ?? 0;
  const maxDe = (sabor: AcompanamientoBotellaItem) => {
    const otros = Math.max(0, asignado - sabor.unidades);
    return Math.max(1, Math.min(unidades - otros, stockDe(sabor.presentacion_id)));
  };
  const requerido = requiereAcompanamiento(bebida, formato);
  // El corte puede salir sin bebida si no hay cover en el bar; la botella
  // con acompañamiento configurado no: el servidor la exige.
  const falta =
    requerido && (opcionesCover.length === 0 ? formato === 'botella' : asignado !== unidades);

  return {
    requerido,
    unidadesPorEntrega: porEntrega,
    unidadesRequeridas: unidades,
    asignado,
    restante,
    opcionesCover,
    opcionesParaAgregar,
    maxDe,
    falta,
  };
}

/**
 * Reparte el total de unidades entre las entregas de una línea: cada entrega
 * recibe `unidadesPorEntrega` y ningún sabor se repite dentro de la misma.
 */
export function dividirRepartoPorEntrega(
  reparto: AcompanamientoBotellaItem[],
  unidadesPorEntrega: number,
  entregas: number,
): AcompanamientoBotellaItem[][] {
  const porEntrega = Math.max(1, Math.floor(Number(unidadesPorEntrega) || 0));
  const totalEntregas = Math.max(0, Math.floor(Number(entregas) || 0));
  const disponibles = reparto
    .map(sabor => ({ ...sabor, unidades: Math.max(0, Math.floor(Number(sabor.unidades) || 0)) }))
    .filter(sabor => sabor.unidades > 0);

  const resultado: AcompanamientoBotellaItem[][] = [];
  for (let indice = 0; indice < totalEntregas; indice += 1) {
    const grupo: AcompanamientoBotellaItem[] = [];
    let faltan = porEntrega;
    for (const sabor of disponibles) {
      if (faltan <= 0) break;
      if (sabor.unidades <= 0) continue;
      const tomar = Math.min(sabor.unidades, faltan);
      grupo.push({ ...sabor, unidades: tomar });
      sabor.unidades -= tomar;
      faltan -= tomar;
    }
    resultado.push(grupo);
  }
  return resultado;
}

/** Recorta el reparto a `maxUnidades`, conservando el orden de los sabores. */
export function recortarReparto(
  reparto: AcompanamientoBotellaItem[],
  maxUnidades: number,
): AcompanamientoBotellaItem[] {
  let restante = Math.max(0, Math.floor(Number(maxUnidades) || 0));
  const resultado: AcompanamientoBotellaItem[] = [];
  for (const sabor of reparto) {
    if (restante <= 0) break;
    const unidades = Math.min(Math.max(0, Math.floor(Number(sabor.unidades) || 0)), restante);
    if (unidades <= 0) continue;
    resultado.push({ ...sabor, unidades });
    restante -= unidades;
  }
  return resultado;
}
