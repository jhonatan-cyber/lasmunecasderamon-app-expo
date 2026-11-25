import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimatedView } from '@/components/ui/AnimatedView';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';

export interface MetricBannerProps {
  label: string;
  amount: string;
  details?: string[];
  color?: string;
  glowColor?: string;
  borderColor?: string;
  cardBg?: string;
  isDark?: boolean;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

/** Banner de una sola métrica (antes TipMetricCards / AnticiposSummaryCard). */
export const MetricBanner: React.FC<MetricBannerProps> = ({
  label,
  amount,
  details = [],
  color,
  glowColor,
  borderColor,
  cardBg,
  isDark,
  style,
}) => {
  const theme = useAccentColor();
  const accent = color ?? theme.accentOnSurface;
  const glow = glowColor ?? accent;
  const neon = (isDark ?? theme.isDark)
    ? {
        shadowColor: glow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        borderColor: glow,
        borderWidth: 1.5,
      }
    : {};

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: cardBg ?? theme.cardBg,
          borderColor: borderColor ?? theme.borderColor,
        },
        neon,
        style,
      ]}
    >
      <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.bannerAmount, { color: accent }]}>{amount}</Text>
      {details.length > 0 && (
        <View style={styles.bannerDetails}>
          {details.map((detail, index) => (
            <React.Fragment key={`${detail}-${index}`}>
              {index > 0 && (
                <View
                  style={[
                    styles.bannerDivider,
                    { backgroundColor: borderColor ?? theme.borderColor },
                  ]}
                />
              )}
              <Text style={[styles.bannerDetail, { color: theme.textSecondary }]}>
                {detail}
              </Text>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
};

export interface MetricCardItem {
  key: string;
  label: string;
  value: string | number;
  /** Texto secundario (llamado `detail`, `subtitle` o `subLabel` antes). */
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor?: string;
  labelColor?: string;
  valueColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export interface MetricCardsProps {
  items: MetricCardItem[];
  /** `grid`: tarjetas de resumen; `compact`: tinted strip; `animated`: estilo caja; `row`: fila pareja. */
  variant?: 'grid' | 'compact' | 'animated' | 'row';
  /** Columnas de la grilla. Por defecto respeta el breakpoint de tablet. */
  columns?: number;
  cardBg?: string;
  borderColor?: string;
  isDark?: boolean;
  animateIndex?: boolean;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
}

export interface MetricCardProps {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  subtitle?: string;
  index?: number;
}

/** Tarjeta individual con animación de entrada (antes `caja/MetricCard`). */
export function MetricCard({
  label,
  value,
  icon,
  color,
  bgColor,
  isDark,
  cardBg,
  borderColor,
  subtitle,
  index = 0,
}: MetricCardProps) {
  const { textPrimary, textSecondary } = useAccentColor();
  const displayValue = typeof value === 'number' ? `$${value.toLocaleString()}` : value;
  const neonGlow = isDark
    ? {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        borderColor: color,
        borderWidth: 1.5,
      }
    : {};

  return (
    <AnimatedView
      from={{ opacity: 0, translateY: 15 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: Math.min(index, 5) * 80 }}
    >
      <View style={[styles.animatedCard, { backgroundColor: cardBg, borderColor }, neonGlow]}>
        <View style={[styles.animatedIconBox, { backgroundColor: bgColor }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.animatedLabel, { color: textSecondary }]}>{label}</Text>
        <Text style={[styles.animatedValue, { color: textPrimary }]}>{displayValue}</Text>
        {subtitle && (
          <Text style={[styles.animatedSubtitle, { color: textSecondary }]}>{subtitle}</Text>
        )}
      </View>
    </AnimatedView>
  );
}

/**
 * Grilla de métricas. Un solo componente para los cuatro diseños que antes se
 * repetían en ventas, pedidos, clientes, caja y horas extras.
 */
export function MetricCards({
  items,
  variant = 'grid',
  columns,
  cardBg,
  borderColor,
  isDark,
  animateIndex = false,
  style,
}: MetricCardsProps) {
  const theme = useAccentColor();
  const { isTablet } = useResponsiveMetrics();
  const columnas = columns ?? (isTablet ? 4 : 2);
  const gridBasis = columnas >= 4 ? '23%' : columnas === 3 ? '31%' : '47%';
  const bg = cardBg ?? theme.cardBg;
  const border = borderColor ?? theme.borderColor;
  const dark = isDark ?? theme.isDark;

  return (
    <View
      style={[
        variant === 'grid' ? styles.grid : styles.row,
        variant === 'compact' && styles.compactRow,
        style,
      ]}
    >
      {items.map((item, index) => {
        const content = (
          <>
            <View
              style={[
                styles.iconBox,
                variant === 'animated' && styles.animatedIconBox,
                {
                  backgroundColor:
                    item.bgColor ?? `${item.color}${variant === 'compact' ? '14' : '18'}`,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={variant === 'compact' ? 16 : variant === 'row' ? 18 : 18}
                color={item.color}
              />
            </View>
            <Text
              style={[
                styles.label,
                variant === 'compact' && styles.compactLabel,
                variant === 'row' && styles.rowLabel,
                variant === 'animated' && styles.animatedLabel,
                { color: item.labelColor ?? (variant === 'compact' ? item.color : theme.textSecondary) },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <Text
              style={[
                styles.value,
                variant === 'compact' && styles.compactValue,
                variant === 'row' && styles.rowValue,
                variant === 'animated' && styles.animatedValue,
                {
                  color:
                    item.valueColor ??
                    item.labelColor ??
                    (variant === 'compact' ? item.color : theme.textPrimary),
                },
              ]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
            {!!item.detail && (
              <Text
                style={[
                  styles.detail,
                  variant === 'compact' && styles.compactDetail,
                  variant === 'animated' && styles.animatedSubtitle,
                  { color: theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.detail}
              </Text>
            )}
          </>
        );

        const cardStyle = [
          styles.card,
          variant === 'compact' && styles.compactCard,
          variant === 'row' && styles.rowCard,
          variant === 'animated' && styles.animatedCard,
          {
            backgroundColor: bg,
            borderColor:
              variant === 'compact'
                ? `${item.color}26`
                : dark && variant === 'grid'
                  ? `${item.color}55`
                  : border,
            ...(variant === 'grid' ? { flexBasis: gridBasis } : {}),
          },
          dark && item.onPress
            ? { shadowColor: item.color, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }
            : {},
        ];

        const inner = item.onPress ? (
          <Pressable
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel ?? `${item.label}: ${item.value}`}
            style={cardStyle}
          >
            {content}
          </Pressable>
        ) : (
          <View
            style={cardStyle}
            accessibilityLabel={item.accessibilityLabel ?? `${item.label}: ${item.value}`}
          >
            {content}
          </View>
        );

        if (!animateIndex) return <React.Fragment key={item.key}>{inner}</React.Fragment>;

        return (
          <AnimatedView
            key={item.key}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: Math.min(index, 5) * 60 }}
          >
            {inner}
          </AnimatedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  bannerLabel: {
    fontSize: 12,
    fontFamily: FontFamily.extrabold,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bannerAmount: {
    fontSize: 38,
    fontFamily: FontFamily.black,
    marginBottom: 12,
  },
  bannerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerDivider: { width: 1, height: 12, alignSelf: 'center' },
  bannerDetail: { fontSize: 13, fontFamily: FontFamily.bold },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  compactRow: {
    marginBottom: 16,
  },
  card: {
    flexGrow: 1,
    minWidth: 0,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    padding: 12,
    gap: 3,
  },
  compactCard: {
    padding: 12,
    borderRadius: 16,
  },
  rowCard: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    padding: 12,
    gap: 3,
  },
  animatedCard: {
    flex: 1,
    minWidth: '44%',
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    overflow: 'hidden',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  animatedIconBox: {
    width: 36,
    height: 36,
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compactLabel: {
    fontSize: 7,
    fontFamily: FontFamily.black,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  rowLabel: { fontSize: 8, letterSpacing: 0.5 },
  animatedLabel: { fontSize: 10, letterSpacing: 0.5 },
  value: {
    fontSize: 18,
    fontFamily: FontFamily.black,
    letterSpacing: -0.4,
  },
  compactValue: { fontSize: 13, marginTop: 2 },
  rowValue: { fontSize: 14 },
  animatedValue: { fontSize: 20, letterSpacing: -0.5 },
  detail: {
    fontSize: 10,
    fontFamily: FontFamily.semibold,
  },
  compactDetail: { fontSize: 9 },
  animatedSubtitle: { fontSize: 10, fontFamily: FontFamily.semibold, marginTop: 2 },
});
