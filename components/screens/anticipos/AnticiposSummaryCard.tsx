import { useAccentColor } from '@/hooks/useAccentColor';
import { MetricBanner } from '@/components/ui/MetricCards';
import { styles } from '../AnticiposScreen.styles';
import { formatCurrency, type VistaAnticipos } from './anticiposUtils';

interface AnticiposSummaryCardProps {
  viewMode: VistaAnticipos;
  totalPendiente: number;
  totalEnCaja: number;
  totalPagado: number;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textSecondary: string;
}

export function AnticiposSummaryCard({
  viewMode,
  totalPendiente,
  totalEnCaja,
  totalPagado,
  accentColor,
  cardBg,
  borderColor,
}: AnticiposSummaryCardProps) {
  const { isDark, accentOnSurface } = useAccentColor();
  const esSolicitudes = viewMode === 'solicitudes';
  const neonColor = esSolicitudes ? accentOnSurface : accentColor;

  return (
    <MetricBanner
      label={
        esSolicitudes
          ? 'Situación de solicitudes'
          : 'Anticipos recibidos'
      }
      amount={`$${formatCurrency(
        esSolicitudes ? totalPendiente : totalPagado,
      )}`}
      details={
        esSolicitudes
          ? [
              `Solicitudes: $${formatCurrency(totalPendiente)} | Aprobadas: $${formatCurrency(totalEnCaja)}`,
            ]
          : [`Total retirado históricamente: $${formatCurrency(totalPagado)}`]
      }
      color={neonColor}
      glowColor={neonColor}
      borderColor={borderColor}
      cardBg={cardBg}
      isDark={isDark}
      style={styles.summaryCard}
    />
  );
}
