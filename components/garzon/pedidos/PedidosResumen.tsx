import React, { useMemo } from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { Colors } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import { MetricCards, type MetricCardItem } from '@/components/ui/MetricCards';
import type { Pedido } from '@/hooks/useMisPedidos';

type PedidosResumenProps = {
  pedidos: Pedido[];
};

/** Resumen de pedidos del garzón, con los mismos indicadores del dashboard. */
export function PedidosResumen({ pedidos }: PedidosResumenProps) {
  const { isDark } = useAccentColor();
  const C = Colors[isDark ? 'dark' : 'light'];

  const items = useMemo<MetricCardItem[]>(() => {
    const totalGanado = pedidos.reduce(
      (sum, pedido) => sum + Number(pedido.total || 0),
      0,
    );
    const pendientes = pedidos.filter((p) => Number(p.estado) === 1).length;
    const aprobados = pedidos.filter((p) => Number(p.estado) === 0).length;
    const rechazados = pedidos.filter((p) => Number(p.estado) === 2).length;

    return [
      {
        key: 'total',
        label: 'Total ganado',
        value: formatCurrency(totalGanado),
        detail: `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`,
        icon: 'cash-outline',
        color: C.success,
      },
      {
        key: 'pendientes',
        label: 'Por aprobar',
        value: String(pendientes),
        detail: 'En espera',
        icon: 'time-outline',
        color: C.info,
      },
      {
        key: 'aprobados',
        label: 'Completados',
        value: String(aprobados),
        detail: 'Exitosos',
        icon: 'checkmark-circle-outline',
        color: C.success,
      },
      {
        key: 'rechazados',
        label: 'Rechazados',
        value: String(rechazados),
        detail: 'No procesados',
        icon: 'close-circle-outline',
        color: C.error,
      },
    ];
  }, [pedidos, C]);

  return <MetricCards items={items} variant="grid" isDark={isDark} />;
}
