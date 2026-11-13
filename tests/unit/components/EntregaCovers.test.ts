import { createElement, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntregaCovers } from '@/components/entradas/entrega-covers/useEntregaCovers';
import { entradasService } from '@/services/entradas';
import { productsService } from '@/services/products';

vi.mock('@tanstack/react-query', async importOriginal =>
  importOriginal<typeof import('@tanstack/react-query')>(),
);

vi.mock('@/services/entradas', () => ({
  entradasService: {
    entregarGrupo: vi.fn(),
    solicitarEntregaCovers: vi.fn(),
    entregar: vi.fn(),
  },
}));
vi.mock('@/services/products', () => ({
  productsService: { forSale: vi.fn(), forCover: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({ default: { fetchError: vi.fn() } }));
vi.mock('@/utils/toast-lazy', () => ({ showToast: vi.fn() }));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
import {
  acompanamientoDe,
  bebidaDe,
  calcularReparto,
  categoriaFueraDeCover,
  claveDe,
  dividirRepartoPorEntrega,
  formatosCover,
  acompanamientosParaLinea,
  consumoSeleccion,
  costoSeleccion,
  stockSeleccionValido,
  unidadesEntregaGrupo,
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

function montar(modo: 'entrega' | 'solicitud' = 'entrega', cantidad = 2) {
  vi.mocked(productsService.forSale).mockResolvedValue({
    success: true,
    data: [
      {
        ...principal,
        opciones_venta: [
          { tipo: 'shot', precio: 2000 },
          { tipo: 'botella', precio_sin_anfitriona: 4000 },
        ],
      },
      { ...secundaria, categoria_nombre: null },
    ],
  });
  vi.mocked(productsService.forCover).mockResolvedValue({
    success: true,
    data: [],
  });
  vi.mocked(entradasService.entregarGrupo).mockResolvedValue({
    success: true,
    data: {
      entradas: cantidad,
      productos: 3,
      montoEntrada: cantidad * 5000,
      montoCobrarBarra: 4000,
      presupuesto: cantidad * 5000 + 4000,
    },
  });
  vi.mocked(entradasService.solicitarEntregaCovers).mockResolvedValue({
    success: true,
    data: { id: 's1' },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  const onClose = vi.fn();
  const onEntregado = vi.fn();
  const hook = renderHook(
    () =>
      useEntregaCovers({
        visible: true,
        modo,
        tope: 99999,
        onClose,
        onEntregado,
        grupo: {
          id: 'g1',
          cliente: 'Mesa 1',
          filas: Array.from({ length: cantidad }, (_, indice) => ({
            id: `t${indice}`,
            grupo_registro_id: 'g1',
            cliente_nombre: 'Mesa 1',
            monto_entrada: 5000,
            metodo_pago: 'efectivo',
            fecha: '2026-11-01',
            hora: '22:00',
            caja_id: 'c1',
            registrado_por_nombre: 'Carla',
          })),
        },
      }),
    { wrapper },
  );
  return { ...hook, onClose, onEntregado };
}

describe('useEntregaCovers: contrato compartido', () => {
  it('respeta cover deshabilitado y cortes sin acompañamiento configurado', () => {
    const sinCover = bebida({ opciones_venta: [{ tipo: 'botella', cover_habilitado: false }, { tipo: 'shot', precio: 2000 }] });
    expect(formatosCover(sinCover, 30000)).toEqual([]);
    const corte = bebida({ opciones_venta: [{ tipo: 'shot', precio: 2000, acompanamiento_cliente: false }] });
    const reparto = calcularReparto(corte, 'corte', [], 1, [cover()]);
    expect(reparto.requerido).toBe(false);
    expect(reparto.unidadesRequeridas).toBe(0);
    expect(reparto.falta).toBe(false);
  });

  it('entrega más productos que entradas con una sola mutación y todo el aporte', async () => {
    const { result, onClose } = montar();
    await waitFor(() => expect(result.current.cargando).toBe(false));
    act(() => result.current.cambiarMontoAdicional('4000'));
    const bebida = result.current.visibles.find(
      (item) => item.bebida.presentacion_id === 'p1',
    )!.bebida;
    act(() => {
      result.current.agregar(bebida, 'corte');
      result.current.agregar(bebida, 'corte');
      result.current.agregar(bebida, 'corte');
    });
    expect(result.current.totalSeleccionado).toBe(3);
    expect(result.current.gruposVisibles.map((item) => item.categoria)).toEqual([
      'Destilados',
      'Sin categoría',
    ]);
    await act(async () => {
      await result.current.entregar();
    });
    expect(entradasService.entregarGrupo).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(entradasService.entregarGrupo).mock.calls[0]![0];
    expect(payload.entrada_ids).toEqual(['t0', 't1']);
    expect(payload.monto_adicional).toBe(4000);
    expect(payload.unidades).toHaveLength(3);
    expect(payload.unidades[0]).toEqual({
      presentacion_id: 'p1',
      tipo_entrega: 'corte',
      acompanamientos: null,
    });
    expect(entradasService.entregar).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('solicita el mismo grupo sin entrada_id por unidad y monto_total igual al aporte', async () => {
    const { result } = montar('solicitud');
    await waitFor(() => expect(result.current.cargando).toBe(false));
    act(() => result.current.cambiarMontoAdicional('4000'));
    const bebida = result.current.visibles[0]!.bebida;
    act(() => {
      result.current.agregar(bebida, 'corte');
      result.current.agregar(bebida, 'corte');
      result.current.agregar(bebida, 'corte');
    });
    await act(async () => {
      await result.current.entregar();
    });
    const payload = vi.mocked(entradasService.solicitarEntregaCovers).mock.calls[0]![0];
    expect(payload).toMatchObject({
      entrada_ids: ['t0', 't1'],
      monto_total: 4000,
      monto_adicional: 4000,
    });
    expect(payload.unidades).toHaveLength(3);
    expect(
      payload.unidades.every(
        (unidad) => !('entrada_id' in unidad) && !('monto_adicional' in unidad),
      ),
    ).toBe(true);
    expect(entradasService.entregarGrupo).not.toHaveBeenCalled();
  });

  it('impide bajar el aporte por debajo de la selección y mantiene ambos valores', async () => {
    const { result } = montar('entrega', 1);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    act(() => result.current.cambiarMontoAdicional('4000'));
    const bebida = result.current.visibles[0]!.bebida;
    act(() => {
      result.current.agregar(bebida, 'corte');
      result.current.agregar(bebida, 'corte');
      result.current.agregar(bebida, 'corte');
    });
    act(() => result.current.cambiarMontoAdicional('500'));
    expect(result.current.adicional).toBe(4000);
    expect(result.current.totalSeleccionado).toBe(3);
    expect(result.current.excedePresupuesto).toBe(false);
    expect(result.current.errorMonto).toMatch(/Quita productos/);
  });

  it('con un fallo atómico conserva la selección y no refresca ni cierra', async () => {
    const { result, onClose, onEntregado } = montar();
    vi.mocked(entradasService.entregarGrupo).mockRejectedValue(new Error('Stock cambió'));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    act(() => result.current.agregar(result.current.visibles[0]!.bebida, 'corte'));
    await act(async () => {
      await result.current.entregar();
    });
    expect(result.current.totalSeleccionado).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(onEntregado).not.toHaveBeenCalled();
    expect(entradasService.entregarGrupo).toHaveBeenCalledTimes(1);
  });
});

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

    expect(formatosCover(conShot, 5000)).toEqual([]);
    expect(formatosCover(conShot, 6000)).toEqual(['corte']);
    // Con más presupuesto también aparece la botella, aunque el corte ya entre.
    expect(formatosCover(conShot, 20000)).toEqual(['corte', 'botella']);
  });

  it('lista botellas por precio SIN sin aplicar el antiguo umbral de cover', () => {
    const soloBotella = bebida({
      precio_venta: 20000,
      precio_sin_anfitriona: 15000,
    });
    expect(formatosCover(soloBotella, 16000)).toEqual(['botella']);
    expect(formatosCover(soloBotella, 14000)).toEqual([]);
    const botellaCara = bebida({
      precio_venta: 12000,
      precio_sin_anfitriona: 8000,
    });
    expect(formatosCover(botellaCara, 8000)).toEqual(['botella']);
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
    const conShot = bebida({
      opciones_venta: [{ tipo: 'shot', precio: 5000 }],
    });
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
    expect(info.opcionesCover.map((opcion) => opcion.presentacion_id)).toEqual(['cover-2']);
    expect(info.opcionesParaAgregar.map((opcion) => opcion.presentacion_id)).toEqual(['cover-2']);

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

    expect(recortarReparto(reparto, 2)).toEqual([{ presentacion_id: 'cover-1', unidades: 2 }]);
  });
});

const principal = bebida({
  presentacion_id: 'p1',
  precio_sin_anfitriona: 4000,
  opciones_venta: [
    { tipo: 'shot', precio: 2000 },
    { tipo: 'botella', acompanamiento: { unidades: 2 } },
  ],
});
const secundaria = bebida({ ...principal, presentacion_id: 'p2' });
const limites = {
  bebidas: [principal, secundaria],
  acompanamientos: [cover()],
  presupuesto: 20000,
};
const agregar = (
  producto = principal,
  formato: 'corte' | 'botella' = 'corte',
  presupuesto = limites.presupuesto,
): SeleccionAction => ({
  type: 'agregar',
  bebida: producto,
  formato,
  ...limites,
  presupuesto,
});
const sabor = (clave: string): SeleccionAction => ({
  type: 'agregarSabor',
  clave,
  opcion: cover(),
  ...limites,
});
const ajustar = (clave: string, delta: number): SeleccionAction => ({
  type: 'ajustarSabor',
  clave,
  presentacionId: 'cover-1',
  delta,
  ...limites,
});

describe('reducer de selección', () => {
  it('permite varios productos por entrada y bloquea solo por presupuesto acumulado', () => {
    const conDos = aplicar(seleccionInicial, [
      agregar(principal, 'corte', 5000),
      agregar(secundaria, 'corte', 5000),
    ]);
    expect(costoSeleccion(conDos, limites.bebidas)).toBe(4000);
    expect(seleccionReducer(conDos, agregar(principal, 'corte', 5000))).toBe(conDos);
    const exacto = seleccionReducer(conDos, agregar(principal, 'corte', 6000));
    expect(costoSeleccion(exacto, limites.bebidas)).toBe(6000);
  });

  it('comparte stock entre formatos de la misma presentación', () => {
    const conCinco = aplicar(seleccionInicial, [
      agregar(),
      agregar(),
      agregar(),
      agregar(),
      agregar(principal, 'botella'),
    ]);
    expect(consumoSeleccion(conCinco).get('p1')).toBe(5);
    expect(seleccionReducer(conCinco, agregar())).toBe(conCinco);
    expect(seleccionReducer(conCinco, agregar(principal, 'botella'))).toBe(conCinco);
  });

  it('consume mililitros de los cortes sin confundirlos con botellas completas', () => {
    const conVolumen = {
      ...principal,
      stock_bar: 1,
      ml_botella: 750,
      ml_shot: 50,
    };
    const contexto = { ...limites, bebidas: [conVolumen], presupuesto: 100000 };
    const accion: SeleccionAction = {
      type: 'agregar',
      bebida: conVolumen,
      formato: 'corte',
      ...contexto,
    };
    const quince = aplicar(
      seleccionInicial,
      Array.from({ length: 15 }, () => accion),
    );
    expect(quince['p1:corte']?.cantidad).toBe(15);
    expect(seleccionReducer(quince, accion)).toBe(quince);
    expect(seleccionReducer(quince, { ...accion, formato: 'botella' })).toBe(quince);
  });

  it('conserva el reparto al sumar el mismo producto', () => {
    const estado = aplicar(seleccionInicial, [
      agregar(principal, 'botella'),
      sabor('p1:botella'),
      agregar(principal, 'botella'),
    ]);
    expect(estado['p1:botella']).toMatchObject({
      cantidad: 2,
      reparto: [{ presentacion_id: 'cover-1', unidades: 1, nombre: 'Coca-Cola 350 ml' }],
    });
  });

  it('quita unidades, recorta el reparto y elimina la línea al llegar a cero', () => {
    const conDos = aplicar(seleccionInicial, [
      agregar(principal, 'botella'),
      agregar(principal, 'botella'),
      sabor('p1:botella'),
      ajustar('p1:botella', 2),
    ]);
    expect(conDos['p1:botella']?.reparto[0]?.unidades).toBe(3);
    const conUna = seleccionReducer(conDos, {
      type: 'quitar',
      clave: 'p1:botella',
      unidadesPorEntrega: 2,
    });
    expect(conUna['p1:botella']).toMatchObject({
      cantidad: 1,
      reparto: [{ unidades: 2 }],
    });
    expect(
      seleccionReducer(conUna, {
        type: 'quitar',
        clave: 'p1:botella',
        unidadesPorEntrega: 2,
      })['p1:botella'],
    ).toBeUndefined();
  });

  it('ignora líneas inexistentes, sabores repetidos y cantidades sobre el reparto requerido', () => {
    expect(
      seleccionReducer(seleccionInicial, {
        type: 'quitar',
        clave: 'nada',
        unidadesPorEntrega: 1,
      }),
    ).toBe(seleccionInicial);
    const estado = aplicar(seleccionInicial, [agregar(), sabor('p1:corte')]);
    expect(seleccionReducer(estado, sabor('p1:corte'))).toBe(estado);
    expect(seleccionReducer(estado, ajustar('p1:corte', 1))).toBe(estado);
    expect(seleccionReducer(estado, ajustar('p1:corte', -1))).toBe(estado);
  });

  it('ajusta, elimina sabores y reinicia la selección', () => {
    const estado = aplicar(seleccionInicial, [
      agregar(),
      agregar(),
      sabor('p1:corte'),
      ajustar('p1:corte', 1),
    ]);
    expect(estado['p1:corte']?.reparto[0]?.unidades).toBe(2);
    const quitado = seleccionReducer(estado, {
      type: 'quitarSabor',
      clave: 'p1:corte',
      presentacionId: 'cover-1',
    });
    expect(quitado['p1:corte']?.reparto).toEqual([]);
    expect(seleccionReducer(estado, { type: 'reiniciar' })).toBe(seleccionInicial);
  });

  it('reserva stock de acompañamientos entre líneas y lo libera al quitarlas', () => {
    const unico = cover({ stock_bar: 1 });
    const contexto = { ...limites, acompanamientos: [unico] };
    const conDos = aplicar(seleccionInicial, [agregar(), agregar(secundaria)]);
    const uno = seleccionReducer(conDos, {
      type: 'agregarSabor',
      clave: 'p1:corte',
      opcion: unico,
      ...contexto,
    });
    expect(
      seleccionReducer(uno, {
        type: 'agregarSabor',
        clave: 'p2:corte',
        opcion: unico,
        ...contexto,
      }),
    ).toBe(uno);
    const disponibles = acompanamientosParaLinea('p2:corte', uno, [unico]);
    const info = calcularReparto(secundaria, 'corte', [], 1, [unico], disponibles);
    expect(info.falta).toBe(true);
    expect(info.opcionesParaAgregar).toEqual([]);
    const libre = seleccionReducer(uno, {
      type: 'quitar',
      clave: 'p1:corte',
      unidadesPorEntrega: 1,
    });
    const repartido = seleccionReducer(libre, {
      type: 'agregarSabor',
      clave: 'p2:corte',
      opcion: unico,
      ...contexto,
    });
    expect(stockSeleccionValido(repartido, limites.bebidas, [unico])).toBe(true);
    expect(repartido['p2:corte']?.reparto).toHaveLength(1);
  });

  it('arma unidades sin asignar entrada ni diferencias individuales por producto', () => {
    const unidades = unidadesEntregaGrupo([
      {
        clave: 'p1:corte',
        bebida: principal,
        formato: 'corte',
        cantidad: 3,
        reparto: [{ presentacion_id: 'cover-1', unidades: 3 }],
      },
    ]);
    expect(unidades).toHaveLength(3);
    for (const unidad of unidades) {
      expect(unidad).toMatchObject({
        presentacion_id: 'p1',
        tipo_entrega: 'corte',
        acompanamientos: [{ presentacion_id: 'cover-1', unidades: 1 }],
      });
      expect(unidad).not.toHaveProperty('entrada_id');
      expect(unidad).not.toHaveProperty('monto_adicional');
    }
  });
});
