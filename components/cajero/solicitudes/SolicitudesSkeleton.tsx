import { ScreenSkeleton } from '@/components/ui/ScreenSkeleton';

type SolicitudesSkeletonProps = {
  bg: string;
  cardBg: string;
  borderColor: string;
  gradientColors: string[];
  insets: { top: number };
  isTablet: boolean;
};

export function SolicitudesSkeleton({
  bg,
  cardBg,
  borderColor,
  gradientColors,
  insets,
}: SolicitudesSkeletonProps) {
  return (
    <ScreenSkeleton
      bg={bg}
      cardBg={cardBg}
      borderColor={borderColor}
      gradientColors={gradientColors}
      insets={insets}
      variant="list"
      cardContent="detail"
      cardCount={4}
      bodyPadding={16}
      gap={16}
      headerMinHeight={160}
      headerPaddingHorizontal={16}
    />
  );
}
