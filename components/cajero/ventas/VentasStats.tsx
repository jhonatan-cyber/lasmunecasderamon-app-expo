import React, { useMemo } from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import { MetricCards, type MetricCardItem } from '@/components/ui/MetricCards';
import type { Venta } from './types';

type VentasStatsProps = {
  ventas: Venta[];
};

/**
 * NOTA: hoy no se renderiza en `ventas.tsx` (solo existe en el barrel y en un
 * mock de test). Se conserva porque el resumen por estado sigue siendo útil;
 * su presentación ya viene de `MetricCards`.
 *
 * Resumen del listado de ventas por estado, equivalente a las tarjetas del
 * dashboard. Los importes se calculan sobre las ventas visibles (la caja
 * abierta o el turno completo), no sobre el resultado de la búsqueda.
 */
export function VentasStats({ ventas }: VentasStatsProps) {
  const { isDark } = useAccentColor();
  const C = Colors[isDark ? 'dark' : 'light'];

  const items = useMemo<MetricCardItem[]>(() => {
    const sumBy = (estado: number) =>
      ventas
        .filter((venta) => Number(venta.estado) === estado)
        .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const countBy = (estado: number) =>
      ventas.filter((venta) => Number(venta.estado) === estado).length;

    const completadas = { count: countBy(1), total: sumBy(1) };
    const proceso = { count: countBy(2), total: sumBy(2) };
    const anulacion = { count: countBy(3), total: sumBy(3) };
    const anuladas = { count: countBy(0), total: sumBy(0) };

    return [
      {
        key: 'completadas',
        label: 'Total completado',
        value: formatCurrency(completadas.total),
        detail: `${completadas.count} ${completadas.count === 1 ? 'venta' : 'ventas'}`,
        icon: 'trending-up',
        color: C.success,
      },
      {
        key: 'proceso',
        label: 'Sin cerrar',
        value: formatCurrency(proceso.total),
        detail: `${proceso.count} ${proceso.count === 1 ? 'cuenta abierta' : 'cuentas abiertas'}`,
        icon: 'time-outline',
        color: C.info,
      },
      {
        key: 'anulacion',
        label: 'Por anular',
        value: String(anulacion.count),
        detail: `Total: ${formatCurrency(anulacion.total)}`,
        icon: 'alert-circle-outline',
        color: C.warning,
      },
      {
        key: 'anuladas',
        label: 'Total cancelado',
        value: formatCurrency(anuladas.total),
        detail: `${anuladas.count} ${anuladas.count === 1 ? 'venta' : 'ventas'}`,
        icon: 'close-circle-outline',
        color: C.error,
      },
    ];
  }, [ventas, C]);

  return <MetricCards items={items} variant="grid" isDark={isDark} />;
}
