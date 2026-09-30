import { describe, expect, it } from 'vitest';
import {
    ANALYTICS_COLORS,
    mapAnalyticsSummary,
    mapWeekBars,
    mapWeekDistribution,
    mapWeekTotals,
    shortDayLabel,
} from '@/utils/analytics';

// Shapes reales: StatsQueries.getUserDashboardSummary y la ruta
// GET /stats/sales-by-week del dashboard.
const summaryPayload = {
    totalAsistencias: 4,
    totalAnticipos: 2,
    totalPropinas: 7,
    totalHorasExtras: 1,
    totalPedidos: 0,
    totalComisiones: 3,
    totalServicios: 5,
    totalACobrar: 13500,
    anticiposPendientes: 1,
    propinasPendientes: 2,
    horasExtrasPendientes: 0,
    comisionesPendientes: 1,
};

const weekPayload = {
    startDate: '2026-09-21',
    endDate: '2026-09-27',
    data: [
        { dia_semana: 'Monday', dia_espanol: 'Lunes', orden: 1, total: 5200, cantidad: 3 },
        { dia_semana: 'Tuesday', dia_espanol: 'Martes', orden: 2, total: 4800, cantidad: 2 },
        { dia_semana: 'Wednesday', dia_espanol: 'Miércoles', orden: 3, total: 0, cantidad: 0 },
        { dia_semana: 'Thursday', dia_espanol: 'Jueves', orden: 4, total: 6100, cantidad: 4 },
        { dia_semana: 'Friday', dia_espanol: 'Viernes', orden: 5, total: 0, cantidad: 0 },
        { dia_semana: 'Saturday', dia_espanol: 'Sábado', orden: 6, total: 9200, cantidad: 6 },
        { dia_semana: 'Sunday', dia_espanol: 'Domingo', orden: 7, total: 0, cantidad: 0 },
    ],
    summary: { totalVentas: 25300, promedioDiario: 3614 },
};

describe('mapAnalyticsSummary', () => {
    it('devuelve los 4 KPI con valor y conteos correctos', () => {
        const stats = mapAnalyticsSummary(summaryPayload);

        expect(stats).toHaveLength(4);
        expect(stats.map((s) => s.title)).toEqual([
            'A cobrar',
            'Servicios',
            'Comisiones',
            'Propinas',
        ]);

        const [aCobrar, servicios, comisiones, propinas] = stats;
        expect(aCobrar.raw).toBe(13500);
        expect(aCobrar.value.startsWith('$')).toBe(true);
        expect(servicios.value).toBe('5');
        expect(comisiones.value).toBe('3');
        expect(comisiones.subtitle).toBe('Registradas');
        expect(propinas.value).toBe('7');
        expect(propinas.subtitle).toBe('Recibidas');
    });

    it('tolera payloads vacíos o con claves ausentes (no revienta la pantalla)', () => {
        expect(mapAnalyticsSummary(undefined)).toHaveLength(4);
        const stats = mapAnalyticsSummary({});
        expect(stats.every((s) => s.raw === 0)).toBe(true);
        expect(stats[0].value).toBe('$0');
    });
});

describe('mapWeekBars', () => {
    it('conserva los 7 días, incluidos los que están en cero', () => {
        const bars = mapWeekBars(weekPayload);

        expect(bars).toHaveLength(7);
        expect(bars[0]).toEqual({
            label: 'Lunes',
            shortLabel: 'Lun',
            value: 5200,
        });
        expect(bars[2].value).toBe(0);
        expect(bars.map((b) => b.value)).toContain(0);
    });

    it('con datos ausentes devuelve una lista vacía', () => {
        expect(mapWeekBars(null)).toEqual([]);
        expect(mapWeekBars({})).toEqual([]);
    });
});

describe('mapWeekDistribution', () => {
    it('filtra los días sin ventas y reparte el 100% con un color por día', () => {
        const points = mapWeekDistribution(weekPayload);

        expect(points).toHaveLength(4);
        expect(points.every((p) => p.value > 0)).toBe(true);

        const percentSum = points.reduce((sum, p) => sum + p.percent, 0);
        expect(percentSum).toBeGreaterThanOrEqual(99.9);
        expect(percentSum).toBeLessThanOrEqual(100.1);

        const colors = new Set(points.map((p) => p.color));
        expect(colors.size).toBe(points.length);
        points.forEach((p) => expect(ANALYTICS_COLORS).toContain(p.color as never));

        const mayor = points.find((p) => p.label === 'Sábado');
        expect(mayor?.value).toBe(9200);
        expect(mayor?.percent).toBeGreaterThan(30);
    });

    it('sin ventas no hay distribución (evita división por cero)', () => {
        expect(
            mapWeekDistribution({
                data: [{ dia_espanol: 'Lunes', total: 0 }],
            }),
        ).toEqual([]);
    });
});

describe('mapWeekTotals', () => {
    it('usa el resumen del endpoint cuando viene', () => {
        expect(mapWeekTotals(weekPayload)).toEqual({
            totalVentas: 25300,
            promedioDiario: 3614,
            startDate: '2026-09-21',
            endDate: '2026-09-27',
        });
    });

    it('recalcula desde data si el endpoint no trae summary', () => {
        const totals = mapWeekTotals({ data: weekPayload.data });
        expect(totals.totalVentas).toBe(25300);
        expect(totals.promedioDiario).toBe(Math.round(25300 / 7));
    });
});

describe('shortDayLabel', () => {
    it('acorta el día para el eje del gráfico', () => {
        expect(shortDayLabel('Miércoles')).toBe('Mié');
        expect(shortDayLabel('Lunes')).toBe('Lun');
        expect(shortDayLabel('')).toBe('');
    });
});
