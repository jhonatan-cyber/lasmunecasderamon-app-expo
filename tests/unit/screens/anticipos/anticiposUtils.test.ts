import { describe, expect, it } from 'vitest';

import {
    calcularTotales,
    filtrarAnticipos,
    formatCurrency,
    normalizeEstado,
} from '@/components/screens/anticipos/anticiposUtils';
import type { Anticipo } from '@/hooks/useAnticipos';

const anticipo = (
    id: number,
    monto: number,
    estado: unknown,
): Anticipo =>
    ({
        id_solicitud: id,
        usuario_id: 1,
        fecha_crea: '2026-10-01T10:00:00Z',
        fecha_mod: null,
        monto,
        estado,
        estado_texto: '',
    }) as Anticipo;

describe('normalizeEstado', () => {
    it('reconoce los estados pendientes', () => {
        expect(normalizeEstado(2)).toBe('pendiente');
        expect(normalizeEstado('2')).toBe('pendiente');
        expect(normalizeEstado('pendiente')).toBe('pendiente');
    });

    it('reconoce los estados confirmados o aprobados', () => {
        expect(normalizeEstado(1)).toBe('confirmada');
        expect(normalizeEstado('1')).toBe('confirmada');
        expect(normalizeEstado('confirmada')).toBe('confirmada');
        expect(normalizeEstado('aprobado')).toBe('confirmada');
        expect(normalizeEstado('aprobada')).toBe('confirmada');
    });

    it('reconoce los estados pagados o entregados', () => {
        expect(normalizeEstado(0)).toBe('pagada');
        expect(normalizeEstado('0')).toBe('pagada');
        expect(normalizeEstado('pagada')).toBe('pagada');
        expect(normalizeEstado('pagado')).toBe('pagada');
        expect(normalizeEstado('entregada')).toBe('pagada');
        expect(normalizeEstado('entregado')).toBe('pagada');
    });

    it('reconoce los estados rechazados', () => {
        expect(normalizeEstado(3)).toBe('rechazada');
        expect(normalizeEstado('3')).toBe('rechazada');
        expect(normalizeEstado('rechazada')).toBe('rechazada');
        expect(normalizeEstado('rechazado')).toBe('rechazada');
    });

    it('deja pasar un estado desconocido como texto', () => {
        expect(normalizeEstado(9)).toBe('9');
        expect(normalizeEstado('en_revision')).toBe('en_revision');
        // La firma no admite nulos, pero los pagos llegan sin tipar desde la API.
        expect(normalizeEstado(null as unknown as number)).toBe('');
        expect(normalizeEstado(undefined as unknown as number)).toBe('');
    });
});

describe('formatCurrency', () => {
    it('separa los miles al estilo chileno', () => {
        expect(formatCurrency(1234567)).toBe('1.234.567');
        expect(formatCurrency(250000)).toBe('250.000');
    });

    it('acepta montos numéricos como texto', () => {
        expect(formatCurrency('15000')).toBe('15.000');
    });

    it('muestra 0 cuando no hay monto', () => {
        expect(formatCurrency(null)).toBe('0');
        expect(formatCurrency(undefined)).toBe('0');
        expect(formatCurrency('')).toBe('0');
    });
});

describe('filtrarAnticipos', () => {
    const solicitudes = [
        anticipo(1, 1000, 2),
        anticipo(2, 2000, 1),
        anticipo(3, 3000, 3),
        anticipo(4, 4000, 'pendiente'),
    ];
    const pagos = [
        anticipo(5, 500, 0),
        anticipo(6, 600, 'pagado'),
        anticipo(7, 700, 'pendiente'),
    ];

    it('en solicitudes sin filtro muestra todas', () => {
        const result = filtrarAnticipos({
            viewMode: 'solicitudes',
            filter: 'todos',
            solicitudes,
            pagos,
        });

        expect(result.map((a) => a.id_solicitud)).toEqual([1, 2, 3, 4]);
    });

    it('filtra solicitudes pendientes', () => {
        const result = filtrarAnticipos({
            viewMode: 'solicitudes',
            filter: 'pendiente',
            solicitudes,
            pagos,
        });

        expect(result.map((a) => a.id_solicitud)).toEqual([1, 4]);
    });

    it('filtra solicitudes aprobadas', () => {
        const result = filtrarAnticipos({
            viewMode: 'solicitudes',
            filter: 'aprobado',
            solicitudes,
            pagos,
        });

        expect(result.map((a) => a.id_solicitud)).toEqual([2]);
    });

    it('filtra solicitudes rechazadas', () => {
        const result = filtrarAnticipos({
            viewMode: 'solicitudes',
            filter: 'rechazado',
            solicitudes,
            pagos,
        });

        expect(result.map((a) => a.id_solicitud)).toEqual([3]);
    });

    it('en la vista de anticipos solo muestra los pagados', () => {
        const result = filtrarAnticipos({
            viewMode: 'anticipos',
            filter: 'todos',
            solicitudes,
            pagos,
        });

        expect(result.map((a) => a.id_solicitud)).toEqual([5, 6]);
    });
});

describe('calcularTotales', () => {
    it('suma pendientes, confirmados y pagados por separado', () => {
        const solicitudes = [
            anticipo(1, 1000, 2),
            anticipo(2, 2500, 'pendiente'),
            anticipo(3, 4000, 1),
            anticipo(4, 999, 3),
        ];
        const pagos = [
            anticipo(5, 500, 0),
            anticipo(6, 700, 'pagado'),
            anticipo(7, 800, 'pendiente'),
        ];

        expect(calcularTotales(solicitudes, pagos)).toEqual({
            totalPendiente: 3500,
            totalEnCaja: 4000,
            totalPagado: 1200,
        });
    });

    it('sin datos todos los totales son 0', () => {
        expect(calcularTotales([], [])).toEqual({
            totalPendiente: 0,
            totalEnCaja: 0,
            totalPagado: 0,
        });
    });
});
