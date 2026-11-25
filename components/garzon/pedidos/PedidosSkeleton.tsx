import React from 'react';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';

interface PedidosSkeletonProps {
  bg: string;
  gradientColors: string[];
  insets: { top: number };
}

export const PedidosSkeleton: React.FC<PedidosSkeletonProps> = ({
  bg,
  gradientColors,
  insets,
}) => {
  const { width, isTablet, isLandscape } = useResponsiveMetrics();
  const columnas = isTablet || isLandscape ? 3 : 2;
  const cardWidth = (width - 55 - (columnas - 1) * 15) / columnas;

  return (
    <ScreenSkeleton
      bg={bg}
      gradientColors={gradientColors}
      insets={insets}
      variant="grid"
      cardCount={6}
      cardWidth={cardWidth}
      cardHeight={180}
      bodyPadding={20}
      gap={15}
      headerMinHeight={140}
      cardAccessibilityLabel="Ver pedido"
    />
  );
};
