import { describe, expect, it } from 'vitest';

import {
    filterEventsByDates,
    getEventLabel,
    getStatusLabel,
} from '@/components/screens/home/eventLabels';

describe('getEventLabel', () => {
    it('distingue comisiones y propinas de venta de las de servicio', () => {
        expect(getEventLabel({ type: 'comision', subType: 'venta' })).toBe(
            'Comisión de Venta',
        );
        expect(getEventLabel({ type: 'comision', subType: 'servicio' })).toBe(
            'Comisión de Servicio',
        );
        expect(getEventLabel({ type: 'propina', subType: 'venta' })).toBe(
            'Propina de Venta',
        );
        expect(getEventLabel({ type: 'propina', subType: 'servicio' })).toBe(
            'Propina',
        );
    });

    it('usa la etiqueta conocida del tipo', () => {
        expect(getEventLabel({ type: 'asistencia' })).toBe('Asistencia');
        expect(getEventLabel({ type: 'anticipo' })).toBe('Anticipo');
        expect(getEventLabel({ type: 'venta' })).toBe('Venta');
        expect(getEventLabel({ type: 'servicio' })).toBe('Servicio');
        expect(getEventLabel({ type: 'gratificacion' })).toBe('Gratificación');
        expect(getEventLabel({ type: 'hora_extra' })).toBe('Hora Extra');
    });

    it('deja el tipo en mayúsculas cuando no hay etiqueta', () => {
        expect(getEventLabel({ type: 'bono' })).toBe('BONO');
    });

    it('sin item no inventa texto', () => {
        expect(getEventLabel(null)).toBe('');
        expect(getEventLabel(undefined)).toBe('');
    });
});

describe('getStatusLabel', () => {
    it('traduce los estados de un servicio', () => {
        const servicio = (estado: unknown) => ({ type: 'servicio', estado });

        expect(getStatusLabel(servicio(0))).toBe('Anulado');
        expect(getStatusLabel(servicio(1))).toBe('Finalizado');
        expect(getStatusLabel(servicio(2))).toBe('En proceso');
        expect(getStatusLabel(servicio(3))).toBe('Pausado');
        expect(getStatusLabel(servicio(4))).toBe('Solicitud anulación');
        expect(getStatusLabel(servicio(9))).toBe('Desconocido');
        expect(getStatusLabel(servicio('2'))).toBe('En proceso');
    });

    it('traduce los estados de una comisión', () => {
        const comision = (estado: unknown) => ({ type: 'comision', estado });

        expect(getStatusLabel(comision(0))).toBe('Anulado');
        expect(getStatusLabel(comision(2))).toBe('Pagado');
        expect(getStatusLabel(comision(1))).toBe('Por cobrar');
        expect(getStatusLabel(comision(3))).toBe('Por cobrar');
    });

    it('traduce los estados de un anticipo', () => {
        const anticipo = (estado: unknown) => ({ type: 'anticipo', estado });

        expect(getStatusLabel(anticipo(0))).toBe('Pagado');
        expect(getStatusLabel(anticipo(1))).toBe('Confirmado');
        expect(getStatusLabel(anticipo(2))).toBe('Pendiente');
        expect(getStatusLabel(anticipo(3))).toBe('Rechazado');
    });

    it('usa los estados genéricos para el resto de los eventos', () => {
        const evento = (estado: unknown) => ({ type: 'propina', estado });

        expect(getStatusLabel(evento(0))).toBe('Pagado');
        expect(getStatusLabel(evento(1))).toBe('Por cobrar');
        expect(getStatusLabel(evento(2))).toBe('Confirmado');
        expect(getStatusLabel(evento(3))).toBe('Rechazado');
        expect(getStatusLabel(evento(4))).toBe('Completado');
        expect(getStatusLabel(evento(7))).toBe('7');
    });

    it('sin item devuelve texto vacío en vez de undefined', () => {
        expect(getStatusLabel(null)).toBe('');
        expect(getStatusLabel(undefined)).toBe('');
    });
});

describe('filterEventsByDates', () => {
    const events = [
        { id: 'a', date: '2026-10-05T12:00:00Z' },
        { id: 'b', date: '2026-10-07T23:30:00-03:00' },
        { id: 'c', date: '2026-10-07T10:00:00Z' },
        { id: 'd', date: '2026-10-09T10:00:00Z' },
    ];

    it('sin fechas seleccionadas no muestra eventos', () => {
        expect(filterEventsByDates(events, [])).toEqual([]);
    });

    it('filtra por día UTC, no por el día local del dispositivo', () => {
        // "b" es 7 de octubre a las 23:30 en UTC-3: en UTC ya es 8 de octubre.
        const result = filterEventsByDates(events, [
            '2026-10-07',
            '2026-10-08',
        ]);

        expect(result.map((e) => e.id)).toEqual(['b', 'c']);
    });

    it('ordena los eventos del más reciente al más antiguo', () => {
        const result = filterEventsByDates(events, [
            '2026-10-05',
            '2026-10-07',
            '2026-10-08',
            '2026-10-09',
        ]);

        expect(result.map((e) => e.id)).toEqual(['d', 'b', 'c', 'a']);
    });

    it('no reordena la lista original', () => {
        filterEventsByDates(events, ['2026-10-09', '2026-10-05']);

        expect(events.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
    });
});
