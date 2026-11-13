import { describe, expect, it, vi } from 'vitest';
import {
  acompanamientosDeColacion,
  type ColacionProducto,
} from '@/services/colaciones-helpers';

vi.mock('@/api/client-safe', () => ({ apiClientSafe: vi.fn() }));

function bebida(
  presentacion_id: number,
  nombre: string,
  presentacion_nombre: string,
  stock_bar: number,
): ColacionProducto {
  return {
    id: presentacion_id,
    producto_id: presentacion_id,
    producto_nombre: nombre,
    presentacion_id,
    presentacion_nombre,
    ml_botella: 1500,
    ml_abierta: 1200,
    ml_colacion: 60,
    stock_bar,
  };
}

describe('acompanamientos de colación', () => {
  it('ofrece el catálogo de analcohólicas sin la bebida elegida', () => {
    const sprite = bebida(2, 'Sprite', '1.5 L', 10);
    const cola = bebida(3, 'Coca-Cola', '1.5 L', 4);
    const producto = bebida(1, 'Vodka', '750 ml', 0);

    const opciones = acompanamientosDeColacion([producto, sprite, cola], producto, 1);

    expect(opciones.map((o) => o.presentacion_id)).toEqual([2, 3]);
    expect(opciones[0]).toMatchObject({
      nombre: 'Sprite 1.5 L',
      presentacion_nombre: '1.5 L',
      ml: 1200,
      stock: 10,
      cantidad: 1,
    });
  });

  it('exige stock de bar suficiente para las unidades configuradas', () => {
    const producto = bebida(1, 'Vodka', '750 ml', 0);
    const conStock = bebida(2, 'Sprite', '1.5 L', 3);
    const sinStock = bebida(3, 'Fanta', '1.5 L', 1);

    const opciones = acompanamientosDeColacion([conStock, sinStock], producto, 2);

    expect(opciones.map((o) => o.presentacion_id)).toEqual([2]);
    expect(opciones[0].cantidad).toBe(2);
  });

  it('no ofrece acompañamiento si la bebida no lo configura', () => {
    const producto = bebida(1, 'Vodka', '750 ml', 0);
    const sprite = bebida(2, 'Sprite', '1.5 L', 10);

    expect(acompanamientosDeColacion([sprite], producto, 0)).toEqual([]);
    expect(acompanamientosDeColacion([sprite], null, 1)).toEqual([]);
  });
});
