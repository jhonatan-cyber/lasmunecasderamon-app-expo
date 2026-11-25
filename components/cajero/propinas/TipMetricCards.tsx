import React from 'react';
import { useAccentColor } from '@/hooks/useAccentColor';
import { MetricBanner } from '@/components/ui/MetricCards';

interface TipMetricCardsProps {
  totalPendiente: number;
  totalGeneral: number;
  pendientesCount: number;

  accentColor: string;
  borderColor: string;
  cardBg: string;
  textSecondary: string;
}

export const TipMetricCards: React.FC<TipMetricCardsProps> = ({
  totalPendiente,
  totalGeneral,
  pendientesCount,
  accentColor,
  borderColor,
  cardBg,
}) => {
  const { accentOnSurface, isDark } = useAccentColor();

  return (
    <MetricBanner
      label="Propinas pendientes"
      amount={`$${totalPendiente.toLocaleString()}`}
      details={[
        `Recibido: $${totalGeneral.toLocaleString()}`,
        `Items: ${pendientesCount}`,
      ]}
      color={accentOnSurface}
      glowColor={accentColor}
      borderColor={borderColor}
      cardBg={cardBg}
      isDark={isDark}
      style={{ marginHorizontal: 16, marginTop: 16 }}
    />
  );
};
