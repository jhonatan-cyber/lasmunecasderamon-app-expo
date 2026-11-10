import { describe, expect, it } from 'vitest';
import {
  acompanamientoDe,
  bebidaDe,
  calcularReparto,
  categoriaFueraDeCover,
  claveDe,
  dividirRepartoPorEntrega,
  formatosCover,
  montoCobroBarra,
  normalizar,
  precioVisible,
  recortarReparto,
} from '@/components/entradas/entrega-covers/helpers';
import {
  seleccionInicial,
  seleccionReducer,
  type SeleccionAction,
} from '@/components/entradas/entrega-covers/reducer';
import type { Acompanamiento, Bebida, Seleccion } from '@/components/entradas/entrega-covers/types';

const bebida = (extra: Partial<Bebida> = {}): Bebida => ({
  presentacion_id: 'pres-1',
  producto_nombre: 'Fernet',
  presentacion_nombre: '750 ml',
  precio_venta: 25000,
  precio_sin_anfitriona: 20000,
  stock_bar: 5,
  categoria_nombre: 'Destilados',
  opciones_venta: [],
  ...extra,
});

const cover = (extra: Partial<Acompanamiento> = {}): Acompanamiento => ({
  presentacion_id: 'cover-1',
  producto_nombre: 'Coca-Cola',
  presentacion_nombre: '350 ml',
  stock_bar: 10,
  ...extra,
});

const aplicar = (estado: Seleccion, acciones: SeleccionAction[]) =>
  acciones.reduce(seleccionReducer, estado);

describe('helpers de entrega de covers', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizar('  Whisky Ñandú  ')).toBe('whisky nandu');
  });

  it('deja fuera analcohólicos y cigarrillos', () => {
    expect(categoriaFueraDeCover('Analcohólicos')).toBe(true);
    expect(categoriaFueraDeCover('Cigarrillos')).toBe(true);
    expect(categoriaFueraDeCover('Destilados')).toBe(false);
    expect(categoriaFueraDeCover(null)).toBe(false);
  });

  it('mapea la fila cruda del bar y cae al precio de venta sin precio de botella', () => {
    const mapeada = bebidaDe({
      presentacion_id: 'p1',
      producto_nombre: 'Fernet',
      presentacion_nombre: '750 ml',
      precio_venta: 25000,
      stock_bar: '3',
      categoria_nombre: 'Destilados',
      opciones_venta: JSON.stringify([{ tipo: 'shot', precio: 6000 }]),
    });

    expect(mapeada).toMatchObject({
      presentacion_id: 'p1',
      precio_venta: 25000,
      precio_sin_anfitriona: 25000,
      stock_bar: 3,
      opciones_venta: [{ tipo: 'shot', precio: 6000 }],
    });
  });

  it('descarta filas sin presentación', () => {
    expect(bebidaDe({ producto_nombre: 'Fantasma' })).toBeNull();
    expect(acompanamientoDe(null)).toBeNull();
  });

  it('lista los formatos que entran en el presupuesto del grupo', () => {
    const conShot = bebida({
      opciones_venta: [{ tipo: 'shot', precio: 6000 }],
      precio_sin_anfitriona: 15000,
      precio_venta: 20000,
    });

    expect(formatosCover(conShot, 5000, 6000)).toEqual([]);
    expect(formatosCover(conShot, 6000, 6000)).toEqual(['corte']);
    // Con más presupuesto también aparece la botella, aunque el corte ya entre.
    expect(formatosCover(conShot, 20000, 6000)).toEqual(['corte', 'botella']);
  });

  it('lista la botella sobre el umbral porque su diferencia se cobra en barra', () => {
    const soloBotella = bebida({ precio_venta: 20000, precio_sin_anfitriona: 15000 });
    expect(formatosCover(soloBotella, 16000, 10000)).toEqual(['botella']);
    expect(formatosCover(soloBotella, 14000, 10000)).toEqual([]);
  });

  it('no lista como cover una botella cuyo precio de venta supera el umbral', () => {
    const botellaCara = bebida({ precio_venta: 12000, precio_sin_anfitriona: 8000 });
    expect(formatosCover(botellaCara, 8000, 10000)).toEqual([]);
  });

  it('muestra el precio del shot para el corte y el de botella sin anfitriona', () => {
    const conShot = bebida({
      opciones_venta: [{ tipo: 'shot', precio: 6000 }],
      precio_sin_anfitriona: 15000,
    });
    expect(precioVisible(conShot, 'corte')).toBe(6000);
    expect(precioVisible(conShot, 'botella')).toBe(15000);
  });

  it('cobra en barra solo lo que supera el umbral de la entrada', () => {
    // Entrada 10.000: el precio igual o menor es cover puro.
    expect(montoCobroBarra(10000, 10000, 8000)).toBe(0);
    expect(montoCobroBarra(12000, 10000, 8000)).toBe(2000);
    // La entrada quedó bajo el tope: se paga precio menos entrada.
    expect(montoCobroBarra(15000, 5000, 10000)).toBe(10000);
    // Bajo el tope vigente no se cobra aunque supere la entrada.
    expect(montoCobroBarra(9000, 5000, 10000)).toBe(0);
  });

  it('arma la clave de selección con presentación y formato', () => {
    expect(claveDe(bebida({ presentacion_id: 'abc' }), 'botella')).toBe('abc:botella');
  });

  it('el corte exige una unidad por entrega y la botella las que tenga configuradas', () => {
    const botellaConCover = bebida({
      opciones_venta: [{ tipo: 'botella', acompanamiento: { unidades: 2.5 } }],
    });
    const covers = [cover()];

    const corte = calcularReparto(botellaConCover, 'corte', [], 1, covers);
    expect(corte).toMatchObject({
      requerido: true,
      unidadesPorEntrega: 1,
      unidadesRequeridas: 1,
      falta: true,
    });

    const botella = calcularReparto(botellaConCover, 'botella', [], 1, covers);
    expect(botella).toMatchObject({
      unidadesPorEntrega: 2,
      unidadesRequeridas: 2,
      asignado: 0,
      restante: 2,
      falta: true,
    });

    const repartida = calcularReparto(
      botellaConCover,
      'botella',
      [{ presentacion_id: 'cover-1', unidades: 2 }],
      1,
      covers,
    );
    expect(repartida).toMatchObject({ asignado: 2, restante: 0, falta: false });
  });

  it('multiplica las unidades requeridas por la cantidad de entregas', () => {
    const botellaConCover = bebida({
      opciones_venta: [{ tipo: 'botella', acompanamiento: { unidades: 2 } }],
    });
    const info = calcularReparto(botellaConCover, 'botella', [], 3, [
      cover(),
      cover({ presentacion_id: 'cover-2', producto_nombre: 'Sprite' }),
    ]);

    expect(info.unidadesPorEntrega).toBe(2);
    expect(info.unidadesRequeridas).toBe(6);
    expect(info.restante).toBe(6);
    expect(info.maxDe({ presentacion_id: 'cover-1', unidades: 1 })).toBe(6);
  });

  it('sin covers disponibles solo la botella queda incompleta', () => {
    const conShot = bebida({ opciones_venta: [{ tipo: 'shot', precio: 5000 }] });
    expect(calcularReparto(conShot, 'corte', [], 1, []).falta).toBe(false);

    const botellaConCover = bebida({
      opciones_venta: [{ tipo: 'botella', acompanamiento: { unidades: 1 } }],
    });
    expect(calcularReparto(botellaConCover, 'botella', [], 1, []).falta).toBe(true);
  });

  it('excluye la propia bebida y los covers sin stock, y limita el máximo por stock', () => {
    const principal = bebida({ presentacion_id: 'cover-1' });
    const covers = [
      cover({ presentacion_id: 'cover-1' }),
      cover({ presentacion_id: 'cover-2', stock_bar: 1 }),
      cover({ presentacion_id: 'cover-3', stock_bar: 0 }),
    ];

    const info = calcularReparto(principal, 'corte', [], 2, covers);
    expect(info.opcionesCover.map(opcion => opcion.presentacion_id)).toEqual(['cover-2']);
    expect(info.opcionesParaAgregar.map(opcion => opcion.presentacion_id)).toEqual(['cover-2']);

    // Con 2 cortes solo hay stock para una coca.
    expect(info.maxDe({ presentacion_id: 'cover-2', unidades: 1 })).toBe(1);
    expect(info.unidadesRequeridas).toBe(2);
  });

  it('divide el reparto entre las entregas y recorta al bajar la cantidad', () => {
    const reparto = [
      { presentacion_id: 'cover-1', unidades: 2 },
      { presentacion_id: 'cover-2', unidades: 1 },
    ];

    expect(dividirRepartoPorEntrega(reparto, 1, 3)).toEqual([
      [{ presentacion_id: 'cover-1', unidades: 1 }],
      [{ presentacion_id: 'cover-1', unidades: 1 }],
      [{ presentacion_id: 'cover-2', unidades: 1 }],
    ]);

    expect(recortarReparto(reparto, 2)).toEqual([
      { presentacion_id: 'cover-1', unidades: 2 },
    ]);
  });
});

describe('reducer de selección', () => {
  it('agrega unidades sin pasar el total de entradas pendientes', () => {
    const conUna = seleccionReducer(seleccionInicial, { type: 'agregar', clave: 'p1:corte', max: 1 });
    expect(conUna['p1:corte']).toEqual({ cantidad: 1, reparto: [] });

    const bloqueado = seleccionReducer(conUna, { type: 'agregar', clave: 'p1:corte', max: 1 });
    expect(bloqueado).toBe(conUna);

    const conDos = seleccionReducer(conUna, { type: 'agregar', clave: 'p2:corte', max: 2 });
    expect(conDos['p2:corte']?.cantidad).toBe(1);
  });

  it('conserva el reparto al seguir sumando el mismo producto', () => {
    const estado = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:botella', max: 5 },
      { type: 'agregarSabor', clave: 'p1:botella', opcion: cover() },
      { type: 'agregar', clave: 'p1:botella', max: 5 },
    ]);

    expect(estado['p1:botella']).toMatchObject({
      cantidad: 2,
      reparto: [{ presentacion_id: 'cover-1', unidades: 1, nombre: 'Coca-Cola 350 ml' }],
    });
  });

  it('quita unidades, recorta el reparto y elimina la línea al llegar a cero', () => {
    const conDos = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:botella', max: 5 },
      { type: 'agregar', clave: 'p1:botella', max: 5 },
      { type: 'agregarSabor', clave: 'p1:botella', opcion: cover() },
      { type: 'ajustarSabor', clave: 'p1:botella', presentacionId: 'cover-1', delta: 2 },
    ]);
    expect(conDos['p1:botella']?.reparto[0]?.unidades).toBe(3);

    const conUna = seleccionReducer(conDos, {
      type: 'quitar',
      clave: 'p1:botella',
      unidadesPorEntrega: 1,
    });
    expect(conUna['p1:botella']?.cantidad).toBe(1);
    expect(conUna['p1:botella']?.reparto[0]?.unidades).toBe(1);

    const vacio = seleccionReducer(conUna, {
      type: 'quitar',
      clave: 'p1:botella',
      unidadesPorEntrega: 1,
    });
    expect(vacio['p1:botella']).toBeUndefined();
  });

  it('ignora acciones sobre líneas inexistentes y sabores ya agregados', () => {
    expect(
      seleccionReducer(seleccionInicial, {
        type: 'quitar',
        clave: 'nada',
        unidadesPorEntrega: 1,
      }),
    ).toBe(seleccionInicial);

    const estado = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:corte', max: 5 },
      { type: 'agregarSabor', clave: 'p1:corte', opcion: cover() },
      { type: 'agregarSabor', clave: 'p1:corte', opcion: cover() },
    ]);
    expect(estado['p1:corte']?.reparto).toHaveLength(1);
  });

  it('ajusta y quita sabores del reparto', () => {
    const estado = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:corte', max: 5 },
      { type: 'agregarSabor', clave: 'p1:corte', opcion: cover() },
      { type: 'ajustarSabor', clave: 'p1:corte', presentacionId: 'cover-1', delta: 1 },
    ]);
    expect(estado['p1:corte']?.reparto[0]?.unidades).toBe(2);

    const quitado = seleccionReducer(estado, {
      type: 'quitarSabor',
      clave: 'p1:corte',
      presentacionId: 'cover-1',
    });
    expect(quitado['p1:corte']?.reparto).toEqual([]);
  });

  it('reinicia la selección al abrir otro grupo', () => {
    const conDatos = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:corte', max: 5 },
    ]);
    expect(seleccionReducer(conDatos, { type: 'reiniciar' })).toBe(seleccionInicial);
  });
});
