import { describe, expect, it } from 'vitest';
import {
  acompanamientoDe,
  bebidaDe,
  calcularReparto,
  categoriaFueraDeCortesia,
  claveDe,
  formatoCortesia,
  normalizar,
  precioVisible,
} from '@/components/entradas/entrega-cortesias/helpers';
import {
  seleccionInicial,
  seleccionReducer,
  type SeleccionAction,
} from '@/components/entradas/entrega-cortesias/reducer';
import type { Acompanamiento, Bebida, Seleccion } from '@/components/entradas/entrega-cortesias/types';

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

describe('helpers de entrega de cortesías', () => {
  it('normaliza tildes y mayúsculas', () => {
    expect(normalizar('  Whisky Ñandú  ')).toBe('whisky nandu');
  });

  it('deja fuera analcohólicos y cigarrillos', () => {
    expect(categoriaFueraDeCortesia('Analcohólicos')).toBe(true);
    expect(categoriaFueraDeCortesia('Cigarrillos')).toBe(true);
    expect(categoriaFueraDeCortesia('Destilados')).toBe(false);
    expect(categoriaFueraDeCortesia(null)).toBe(false);
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

  it('elige corte si el shot entra en el umbral y botella si entran ambos precios', () => {
    const conShot = bebida({ opciones_venta: [{ tipo: 'shot', precio: 6000 }] });
    expect(formatoCortesia(conShot, 6000)).toBe('corte');
    expect(formatoCortesia(conShot, 5000)).toBeNull();

    const soloBotella = bebida({ precio_venta: 20000, precio_sin_anfitriona: 15000 });
    expect(formatoCortesia(soloBotella, 20000)).toBe('botella');
    expect(formatoCortesia(soloBotella, 19000)).toBeNull();
  });

  it('muestra el precio del shot para el corte y el de botella sin anfitriona', () => {
    const conShot = bebida({
      opciones_venta: [{ tipo: 'shot', precio: 6000 }],
      precio_sin_anfitriona: 15000,
    });
    expect(precioVisible(conShot, 'corte')).toBe(6000);
    expect(precioVisible(conShot, 'botella')).toBe(15000);
  });

  it('arma la clave de selección con presentación y formato', () => {
    expect(claveDe(bebida({ presentacion_id: 'abc' }), 'botella')).toBe('abc:botella');
  });

  it('el corte exige una unidad de cover y la botella las que tenga configuradas', () => {
    const botellaConCover = bebida({
      opciones_venta: [{ tipo: 'botella', acompanamiento: { unidades: 2.5 } }],
    });
    const covers = [cover()];

    const corte = calcularReparto(botellaConCover, 'corte', [], 1, covers);
    expect(corte).toMatchObject({ requerido: true, unidadesRequeridas: 1, falta: true });

    const botella = calcularReparto(botellaConCover, 'botella', [], 1, covers);
    expect(botella).toMatchObject({ unidadesRequeridas: 2, asignado: 0, restante: 2, falta: true });

    const repartida = calcularReparto(
      botellaConCover,
      'botella',
      [{ presentacion_id: 'cover-1', unidades: 2 }],
      1,
      covers,
    );
    expect(repartida).toMatchObject({ asignado: 2, restante: 0, falta: false });
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

    // stock 1 repartido en 2 entregas no permite subir de 1 unidad.
    expect(info.maxDe({ presentacion_id: 'cover-2', unidades: 1 })).toBe(1);
  });
});

describe('reducer de selección', () => {
  it('agrega unidades sin pasar el total de entradas pendientes', () => {
    const conUna = seleccionReducer(seleccionInicial, { type: 'agregar', clave: 'p1:corte', max: 1 });
    expect(conUna['p1:corte']).toEqual({ cantidad: 1, reparto: [], adicional: '' });

    const bloqueado = seleccionReducer(conUna, { type: 'agregar', clave: 'p1:corte', max: 1 });
    expect(bloqueado).toBe(conUna);

    const conDos = seleccionReducer(conUna, { type: 'agregar', clave: 'p2:corte', max: 2 });
    expect(conDos['p2:corte']?.cantidad).toBe(1);
  });

  it('conserva reparto y adicional al seguir sumando el mismo producto', () => {
    const estado = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:botella', max: 5 },
      { type: 'agregarSabor', clave: 'p1:botella', opcion: cover() },
      { type: 'cambiarAdicional', clave: 'p1:botella', valor: '1500' },
      { type: 'agregar', clave: 'p1:botella', max: 5 },
    ]);

    expect(estado['p1:botella']).toMatchObject({
      cantidad: 2,
      adicional: '1500',
      reparto: [{ presentacion_id: 'cover-1', unidades: 1, nombre: 'Coca-Cola 350 ml' }],
    });
  });

  it('quita unidades y elimina la línea al llegar a cero', () => {
    const conDos = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:corte', max: 5 },
      { type: 'agregar', clave: 'p1:corte', max: 5 },
    ]);
    const conUna = seleccionReducer(conDos, { type: 'quitar', clave: 'p1:corte' });
    expect(conUna['p1:corte']?.cantidad).toBe(1);

    const vacio = seleccionReducer(conUna, { type: 'quitar', clave: 'p1:corte' });
    expect(vacio['p1:corte']).toBeUndefined();
  });

  it('ignora acciones sobre líneas inexistentes y sabores ya agregados', () => {
    expect(seleccionReducer(seleccionInicial, { type: 'quitar', clave: 'nada' })).toBe(seleccionInicial);

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

  it('deja solo dígitos en el adicional', () => {
    const estado = aplicar(seleccionInicial, [
      { type: 'agregar', clave: 'p1:corte', max: 5 },
      { type: 'cambiarAdicional', clave: 'p1:corte', valor: '$1.500' },
    ]);
    expect(estado['p1:corte']?.adicional).toBe('1500');
  });
});
