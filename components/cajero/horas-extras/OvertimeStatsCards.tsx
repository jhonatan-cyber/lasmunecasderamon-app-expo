import { formatCurrency } from '@/utils/format';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MetricCards, type MetricCardItem } from '@/components/ui/MetricCards';

interface Stats {
  totalRegistros: number;
  totalMonto: number;
  totalHoras: number;
  totalAPagar: number;
}

interface OvertimeStatsCardsProps {
  stats: Stats;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}

export function OvertimeStatsCards({
  stats,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
}: OvertimeStatsCardsProps) {
  const { accentColor: themeAccent, accentOnSurface } = useAccentColor();

  const items: MetricCardItem[] = [
    {
      key: 'horas',
      label: 'Horas',
      value: stats.totalHoras.toFixed(1),
      icon: 'time-outline',
      color: themeAccent,
      bgColor: `${themeAccent}15`,
      valueColor: textPrimary,
    },
    {
      key: 'monto',
      label: 'Total Monto',
      value: formatCurrency(stats.totalMonto),
      icon: 'cash-outline',
      color: accentOnSurface,
      bgColor: `${accentOnSurface}15`,
      valueColor: textPrimary,
    },
    {
      key: 'por-cobrar',
      label: 'Por Cobrar',
      value: formatCurrency(stats.totalAPagar),
      icon: 'wallet-outline',
      color: accentColor,
      bgColor: `${accentColor}15`,
      valueColor: accentOnSurface,
    },
  ];

  return (
    <MetricCards
      items={items}
      variant="row"
      cardBg={cardBg}
      borderColor={borderColor}
      style={{ paddingHorizontal: 16, marginTop: 16 }}
    />
  );
}
