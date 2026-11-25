import React from "react";
import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { BorderRadius } from "@/constants/spacing";
import { ScreenSkeleton } from "@/components/ui/ScreenSkeleton";



type VentasCardSkeletonProps = {
  isTablet: boolean;
  cardBg: string;
  borderColor: string;
};

export function VentaCardSkeleton({ isTablet, cardBg, borderColor }: VentasCardSkeletonProps) {
  return (
    <View
      style={{
        width: isTablet ? '48.5%' : '100%',
        padding: 16,
        borderRadius: BorderRadius.card,
        marginBottom: 14,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={20} borderRadius={12} />
      </View>
      <View style={{ gap: 8, marginBottom: 15 }}>
        <Skeleton width='90%' height={14} />
        <Skeleton width='70%' height={14} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 4 }}>
          <Skeleton width={60} height={12} />
          <Skeleton width={100} height={24} />
        </View>
        <Skeleton width={100} height={40} borderRadius={12} />
      </View>
    </View>
  );
}



type VentasSkeletonProps = {
  bg: string;
  cardBg: string;
  borderColor: string;
  gradientColors: string[];
  insets: { top: number };
  isTablet: boolean;
};

export function VentasSkeleton({ bg, cardBg, borderColor, gradientColors, insets, isTablet }: VentasSkeletonProps) {
  return (
    <ScreenSkeleton
      bg={bg}
      cardBg={cardBg}
      borderColor={borderColor}
      gradientColors={gradientColors}
      insets={insets}
      variant="list"
      cardContent="simple"
      cardCount={4}
      bodyPadding={isTablet ? 12 : 16}
      gap={12}
      headerPaddingHorizontal={16}
      showSummary
      showTabs
      summaryHeight={isTablet ? 180 : 140}
    />
  );
}
