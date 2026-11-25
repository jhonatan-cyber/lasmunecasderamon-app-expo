import React from 'react';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';

type Props = {
  bg: string;
  cardBg: string;
  borderColor: string;
  spacing: number;
};

export function NuevaVentaSkeleton({ bg, cardBg, borderColor, spacing }: Props) {
  return (
    <ScreenSkeleton
      bg={bg}
      cardBg={cardBg}
      borderColor={borderColor}
      gradientColors={[bg, bg]}
      insets={{ top: 0 }}
      showHeader={false}
      headerSlot={
        <PremiumHeader title="Nueva Venta" subtitle="Cargando información..." />
      }
      variant="form"
      cardCount={5}
      bodyPadding={spacing}
      cardAccessibilityLabel="Cargando venta"
    />
  );
}
