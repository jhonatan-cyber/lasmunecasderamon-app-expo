import { useAccentColor } from '@/hooks/useAccentColor';
import { MetricCards, type MetricCardItem } from '@/components/ui/MetricCards';

interface Props {
  totalServicios: number;
  totalConsumo: number;
  totalCargas: number;
}

export function HistorySummaryCards({ totalServicios, totalConsumo, totalCargas }: Props) {
  const { accentColor, accentUi, accentOnSurface } = useAccentColor();

  const items: MetricCardItem[] = [
    {
      key: 'servicios',
      label: 'Servicios',
      value: `$${totalServicios.toLocaleString('es-CL')}`,
      icon: 'bed-outline',
      color: accentColor,
      labelColor: accentOnSurface,
    },
    {
      key: 'consumo',
      label: 'Consumo',
      value: `$${totalConsumo.toLocaleString('es-CL')}`,
      icon: 'cart-outline',
      color: accentUi,
      labelColor: accentOnSurface,
    },
    {
      key: 'cargas',
      label: 'Cargado',
      value: `$${totalCargas.toLocaleString('es-CL')}`,
      icon: 'arrow-up-circle-outline',
      color: accentOnSurface,
      labelColor: accentOnSurface,
    },
  ];

  return <MetricCards items={items} variant="compact" />;
}
