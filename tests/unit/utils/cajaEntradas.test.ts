import { describe, expect, it } from 'vitest';
import type { EntradaCliente } from '@/services/entradas';
import { resumenEntradasDelTurno } from '@/utils/cajaEntradas';

function entrada(
    id: string,
    cajaId: string | null,
    monto: number,
    estado: EntradaCliente['cover_estado'] = 'pendiente',
    origen: EntradaCliente['anulacion_origen'] = null
): EntradaCliente {
    return {
        id,
        grupo_registro_id: null,
        cliente_nombre: null,
        monto_entrada: monto,
        monto_bebida_adicional: 0,
        metodo_pago: 'efectivo',
        baucher_foto: null,
        caja_id: cajaId,
        venta_id: null,
        bebida_cover: null,
        acompanamiento_bebida: null,
        productos_cover: null,
        cantidad_productos_cover: 0,
        fecha: '2026-11-24',
        hora: '21:00',
        registrado_por_nombre: 'Prueba',
        cover_estado: estado,
        anulacion_origen: origen,
        cover_entregada_at: null,
        cover_entregada_por_nombre: null,
    };
}

describe('resumenEntradasDelTurno', () => {
    const entradas = [
        entrada('1', 'caja-actual', 10000),
        entrada('2', 'caja-actual', 10000, 'entregada'),
        entrada('3', 'caja-anterior', 5000),
        entrada('4', 'caja-actual', 8000, 'anulada', 'manual'),
        entrada('5', 'caja-actual', 7000, 'anulada', 'cierre'),
    ];

    it('solo cuenta las entradas de la caja abierta', () => {
        expect(resumenEntradasDelTurno(entradas, 'caja-actual')).toEqual({
            total: 27000,
            cantidad: 3,
        });
    });

    it('no cuenta las anulaciones devueltas al cliente', () => {
        const sinManuales = entradas.filter((item) => item.id !== '4');
        expect(resumenEntradasDelTurno(sinManuales, 'caja-actual').cantidad).toBe(3);
    });

    it('devuelve cero si no hay caja abierta', () => {
        expect(resumenEntradasDelTurno(entradas, null)).toEqual({ total: 0, cantidad: 0 });
        expect(resumenEntradasDelTurno(null, 'caja-actual')).toEqual({ total: 0, cantidad: 0 });
    });
});
