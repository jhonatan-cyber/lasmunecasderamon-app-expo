import { LinearGradient } from 'expo-linear-gradient';
import React, { type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { BorderRadius } from '@/constants/spacing';

export interface ScreenSkeletonProps {
  bg: string;
  gradientColors: string[];
  insets: { top: number };
  /** `grid`: tarjetas sueltas; `list`: tarjetas con borde; `form`: etiqueta + campo. */
  variant?: 'grid' | 'list' | 'form';
  cardCount?: number;
  cardBg?: string;
  borderColor?: string;
  cardWidth?: number | string;
  cardHeight?: number;
  cardBorderRadius?: number;
  /** Contenido interno de cada tarjeta en `variant="list"`. */
  cardContent?: 'detail' | 'simple';
  bodyPadding?: number;
  gap?: number;
  headerMinHeight?: number;
  headerPaddingHorizontal?: number;
  cardAccessibilityLabel?: string;
  showSummary?: boolean;
  showTabs?: boolean;
  summaryHeight?: number;
  showHeader?: boolean;
  /** Cabecera propia (p. ej. `PremiumHeader`) en vez del degradado por defecto. */
  headerSlot?: ReactNode;
}

/**
 * Skeleton de pantalla con header degradado y cuerpo repetitivo.
 * Reemplaza las copias casi idénticas de ventas, pedidos, solicitudes,
 * servicios, nueva venta y nuevo servicio.
 */
export const ScreenSkeleton: React.FC<ScreenSkeletonProps> = ({
  bg,
  gradientColors,
  insets,
  variant = 'grid',
  cardCount = 4,
  cardBg,
  borderColor,
  cardWidth = 180,
  cardHeight,
  cardBorderRadius = BorderRadius.card,
  cardContent = 'detail',
  bodyPadding = 20,
  gap = 12,
  headerMinHeight = 140,
  headerPaddingHorizontal = 20,
  cardAccessibilityLabel,
  showSummary = false,
  showTabs = false,
  summaryHeight = 180,
  showHeader = true,
  headerSlot,
}) => {
  const body = (
    <>
      {Array.from({ length: cardCount }).map((_, index) => {
        const key = index + 1;

        if (variant === 'grid') {
          return (
            <Skeleton
              key={key}
              width={cardWidth}
              height={cardHeight ?? 180}
              borderRadius={cardBorderRadius}
              accessibilityRole="button"
              accessibilityLabel={cardAccessibilityLabel}
            />
          );
        }

        if (variant === 'form') {
          return (
            <View key={key} style={{ marginBottom: 20, gap: 10 }}>
              <Skeleton width={100} height={18} accessibilityLabel={cardAccessibilityLabel} />
              <Skeleton width="100%" height={56} borderRadius={16} accessibilityLabel={cardAccessibilityLabel} />
            </View>
          );
        }

        return (
          <View
            key={key}
            style={{
              flex: 1,
              borderRadius: cardBorderRadius,
              padding: 16,
              borderWidth: 1,
              marginBottom: 16,
              backgroundColor: cardBg,
              borderColor,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 15,
              }}
            >
              <Skeleton width={120} height={20} />
              <Skeleton width={80} height={20} borderRadius={10} />
            </View>
            <Skeleton
              width="100%"
              height={60}
              borderRadius={12}
              style={{ marginBottom: 15 }}
            />
            {cardContent === 'detail' && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
                <Skeleton style={{ flex: 1 }} height={44} borderRadius={12} />
              </View>
            )}
          </View>
        );
      })}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {!showHeader ? (
        headerSlot
      ) : (
        <LinearGradient
          colors={gradientColors as unknown as readonly [string, string, ...string[]]}
          style={{
            paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20),
            paddingBottom: 25,
            paddingHorizontal: headerPaddingHorizontal,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            minHeight: headerMinHeight,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <Skeleton width={150} height={30} />
            <Skeleton width={44} height={44} borderRadius={22} />
          </View>
          <Skeleton width="60%" height={24} />
        </LinearGradient>
      )}

      {variant === 'grid' || variant === 'form' ? (
        <ScrollView
          style={{ flex: 1, padding: bodyPadding }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: variant === 'grid' ? 'row' : undefined, flexWrap: variant === 'grid' ? 'wrap' : undefined, gap }}
        >
          {body}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: bodyPadding, gap }}>
          {showSummary && (
            <Skeleton
              height={summaryHeight}
              borderRadius={24}
              style={{ marginBottom: 20 }}
            />
          )}
          {showTabs && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
              <Skeleton style={{ flex: 1 }} height={44} borderRadius={16} />
            </View>
          )}
          {body}
        </ScrollView>
      )}
    </View>
  );
};
