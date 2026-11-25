import React from 'react';
import { PremiumHeader } from '@/components/ui/PremiumHeader';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';

type Props = {
  bg: string;
  cardBg: string;
  borderColor: string;
};

export function NuevoServicioSkeleton({ bg, cardBg, borderColor }: Props) {
  return (
    <ScreenSkeleton
      bg={bg}
      cardBg={cardBg}
      borderColor={borderColor}
      gradientColors={[bg, bg]}
      insets={{ top: 0 }}
      showHeader={false}
      headerSlot={
        <PremiumHeader title="Nuevo Servicio" subtitle="Cargando información..." />
      }
      variant="form"
      cardCount={5}
      bodyPadding={16}
      cardAccessibilityLabel="Cargando servicio"
    />
  );
}
