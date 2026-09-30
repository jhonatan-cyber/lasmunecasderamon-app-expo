import { formatCurrency } from '@/utils/format';

/**
 * Mapeo de las respuestas de `GET /stats/dashboard-summary` y
 * `GET /stats/sales-by-week` a los modelos que consume la pantalla de
 * Analíticas. Es la contraparte de `analytics_notifier.dart` de Flutter
 * (mismos 4 KPI, mismas barras por día y misma distribución semanal).
 *
 * Todo es puro y sin I/O para poder testearlo sin React Native.
 */

/** Paleta de la distribución (mismos hex que Flutter). */
export const ANALYTICS_COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
] as const;

export interface AnalyticsStat {
  title: string;
  value: string;
  subtitle?: string;
  /** Nombre del icono Ionicons (se castea en la pantalla). */
  icon: string;
  /** Valor crudo para ordenar o comparar. */
  raw: number;
}

export interface AnalyticsBar {
  label: string;
  shortLabel: string;
  value: number;
}

export interface AnalyticsPoint {
  label: string;
  shortLabel: string;
  value: number;
  /** Participación sobre el total de la semana (0–100, 1 decimal). */
  percent: number;
  color: string;
}

export interface AnalyticsTotals {
  totalVentas: number;
  promedioDiario: number;
  startDate: string;
  endDate: string;
}

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const labelOf = (row: Record<string, unknown>): string =>
  String(row.dia_espanol ?? row.dia_semana ?? '');

/** 'Lunes' → 'Lun' (etiqueta corta para el eje del gráfico). */
export const shortDayLabel = (label: string): string => label.slice(0, 3);

const rowsOfWeek = (week: unknown): Record<string, unknown>[] => {
  const data = (week as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
};

/**
 * 4 tarjetas del resumen: A cobrar (monto) + Servicios/Comisiones/Propinas
 * (conteos), tal como las devuelve `StatsQueries.getUserDashboardSummary`.
 */
export function mapAnalyticsSummary(summary: unknown): AnalyticsStat[] {
  const s = (summary ?? {}) as Record<string, unknown>;
  const totalACobrar = toNumber(s.totalACobrar);

  return [
    {
      title: 'A cobrar',
      value: formatCurrency(totalACobrar),
      icon: 'trending-up',
      raw: totalACobrar,
    },
    {
      title: 'Servicios',
      value: String(toNumber(s.totalServicios)),
      icon: 'bed',
      raw: toNumber(s.totalServicios),
    },
    {
      title: 'Comisiones',
      value: String(toNumber(s.totalComisiones)),
      subtitle: 'Registradas',
      icon: 'cash',
      raw: toNumber(s.totalComisiones),
    },
    {
      title: 'Propinas',
      value: String(toNumber(s.totalPropinas)),
      subtitle: 'Recibidas',
      icon: 'gift',
      raw: toNumber(s.totalPropinas),
    },
  ];
}

/** Barras diarias: los 7 días de la semana (los en cero también). */
export function mapWeekBars(week: unknown): AnalyticsBar[] {
  return rowsOfWeek(week).map((row) => {
    const label = labelOf(row);
    return { label, shortLabel: shortDayLabel(label), value: toNumber(row.total) };
  });
}

/**
 * Distribución semanal: solo los días con ventas, con su participación y un
 * color por día (la rueda de colores de `ANALYTICS_COLORS`).
 */
export function mapWeekDistribution(week: unknown): AnalyticsPoint[] {
  const rows = rowsOfWeek(week)
    .map((row) => ({ label: labelOf(row), value: toNumber(row.total) }))
    .filter((row) => row.value > 0);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return [];

  return rows.map((row, index) => ({
    label: row.label,
    shortLabel: shortDayLabel(row.label),
    value: row.value,
    percent: Math.round((row.value / total) * 1000) / 10,
    color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length],
  }));
}

/**
 * Totales de la semana. El endpoint ya trae `summary`; si no llega (respuesta
 * mínima), se recalcula desde `data` para no mostrar ceros inventados.
 */
export function mapWeekTotals(week: unknown): AnalyticsTotals {
  const w = (week ?? {}) as Record<string, unknown>;
  const summary = (w.summary ?? {}) as Record<string, unknown>;
  const rows = rowsOfWeek(week);

  const computedTotal = rows.reduce((sum, row) => sum + toNumber(row.total), 0);
  const totalVentas =
    summary.totalVentas !== undefined ? toNumber(summary.totalVentas) : computedTotal;
  const promedioDiario =
    summary.promedioDiario !== undefined
      ? toNumber(summary.promedioDiario)
      : rows.length > 0
        ? Math.round(computedTotal / rows.length)
        : 0;

  return {
    totalVentas,
    promedioDiario,
    startDate: String(w.startDate ?? ''),
    endDate: String(w.endDate ?? ''),
  };
}
