import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { ensureContrast, readableTextColor, withAlpha } from '@/utils/color';

/**
 * `tile` es el cuadro vertical del dashboard (ícono en chip de color, título y
 * descripción debajo). `row` es la fila compacta que se usa cuando la tarjeta
 * acompaña a un bloque de datos y no a un menú de módulos.
 */
export type DashboardCardVariant = 'tile' | 'row';

export interface DashboardActionCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  borderColor?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: DashboardCardVariant;
  /** Contador que se muestra como pastilla. `0` o `undefined` la oculta. */
  badge?: number;
  /** Cómo se anuncia el contador a lectores de pantalla. */
  badgeLabel?: string;
  /** Módulo deshabilitado (caja cerrada): se dibuja atenuado y con candado. */
  bloqueado?: boolean;
}

export const DashboardActionCard = ({
  title,
  description,
  icon,
  color,
  borderColor,
  onPress,
  disabled,
  variant = 'tile',
  badge,
  badgeLabel,
  bloqueado = false,
}: DashboardActionCardProps) => {
  const {
    isDark,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor: themeBorder,
    surfaceMuted,
  } = useAccentColor();
  const { isTablet } = useResponsiveMetrics();

  const showBadge = typeof badge === 'number' && badge > 0;
  const badgeText = showBadge ? (badge as number) > 99 ? '99+' : String(badge) : '';

  const accessibilityLabel = bloqueado
    ? `${title}: ${description}. Requiere una caja abierta`
    : showBadge
      ? `${title}: ${description}. ${badge} ${badgeLabel ?? 'pendientes'}`
      : `${title}: ${description}`;

  const iconSize = isTablet ? 30 : 24;
  const titleSize = FontSize.sm;
  const descSize = FontSize.xs;
  const padding = isTablet ? 18 : 14;

  if (variant === 'row') {
    return (
      <AnimatedButton
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={disabled ? 'Desactivado' : 'Toque para abrir'}
        accessibilityState={{ disabled: !!disabled }}
        style={[
          styles.cardContainer,
          {
            backgroundColor: cardBg,
            padding,
            opacity: disabled ? 0.45 : 1,
            borderLeftColor: disabled ? (isDark ? '#333333' : '#DDDDDD') : color,
          },
        ]}
      >
        <View style={styles.content}>
          {/* Icon in top-left corner */}
          <Ionicons
            name={icon}
            size={isTablet ? 30 : 22}
            color={disabled ? (isDark ? '#555555' : '#BBBBBB') : color}
          />

          {/* Text content */}
          <View style={styles.textContainer}>
            {/* Title as main element */}
            <Text
              maxFontSizeMultiplier={1.3}
              numberOfLines={2}
              style={[
                styles.mainTitle,
                {
                  fontSize: isTablet ? 20 : FontSize.sm,
                  color: disabled ? (isDark ? '#666666' : '#999999') : textPrimary,
                },
              ]}
            >
              {title}
            </Text>

            {/* Description below title */}
            <Text
              maxFontSizeMultiplier={1.3}
              numberOfLines={2}
              style={[
                styles.subDescription,
                {
                  fontSize: isTablet ? 14 : FontSize.xs,
                  color: disabled ? (isDark ? '#444444' : '#CCCCCC') : textSecondary,
                },
              ]}
            >
              {description}
            </Text>
          </View>
        </View>
      </AnimatedButton>
    );
  }

  // Variante tile: chip de color arriba, título y descripción debajo.
  const chipSize = isTablet ? 58 : 46;
  const chipRadius = isTablet ? 18 : 14;
  const mutedColor = isDark ? '#555555' : '#BBBBBB';
  // Bloqueado (caja cerrada): el módulo sigue siendo legible, solo pierde el
  // color. Antes se bajaba la opacidad de toda la card y sobre fondo blanco
  // quedaba un marco vacío con el texto desvanecido.
  const iconColor = disabled
    ? mutedColor
    : bloqueado
      ? withAlpha(ensureContrast(color, cardBg, 3), 0.45)
      : ensureContrast(color, cardBg, 3);
  const chipBg = disabled
    ? withAlpha(mutedColor, isDark ? 0.16 : 0.12)
    : bloqueado
      ? withAlpha(color, isDark ? 0.12 : 0.08)
      : withAlpha(color, isDark ? 0.22 : 0.14);

  return (
    <AnimatedButton
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        disabled
          ? 'Desactivado'
          : bloqueado
            ? 'Requiere una caja abierta'
            : 'Toque para abrir'
      }
      accessibilityState={{ disabled: !!disabled || bloqueado }}
      style={[
        styles.tile,
        {
          backgroundColor: cardBg,
          borderColor: borderColor ?? themeBorder,
          padding,
          minHeight: isTablet ? 176 : 136,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.tileHeader}>
        <View
          style={[
            styles.chip,
            {
              width: chipSize,
              height: chipSize,
              borderRadius: chipRadius,
              backgroundColor: chipBg,
            },
          ]}
        >
          <Ionicons name={icon} size={iconSize} color={iconColor} />
        </View>

        {bloqueado ? (
          // Bloqueado: solo el candado. El contador no se muestra: el módulo
          // está cerrado y el número invites a tocarlo.
          <View style={[styles.badge, styles.badgeBloqueado, { backgroundColor: surfaceMuted }]}>
            <Ionicons
              name="lock-closed"
              size={isTablet ? 13 : 11}
              color={textSecondary}
            />
          </View>
        ) : (
          showBadge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: disabled ? mutedColor : color },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.badgeText,
                  {
                    color: disabled
                      ? readableTextColor(mutedColor)
                      : readableTextColor(color),
                    fontSize: isTablet ? 13 : 11,
                  },
                ]}
              >
                {badgeText}
              </Text>
            </View>
          )
        )}
      </View>

      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        style={[
          styles.tileTitle,
          {
            fontSize: titleSize,
            color: disabled ? (isDark ? '#666666' : '#999999') : textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        style={[
          styles.tileDescription,
          {
            fontSize: descSize,
            color: disabled ? (isDark ? '#444444' : '#CCCCCC') : textSecondary,
          },
        ]}
      >
        {description}
      </Text>
    </AnimatedButton>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  mainTitle: {
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  subDescription: {
    fontWeight: '500',
    lineHeight: 16,
  },
  tile: {
    flex: 1,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBloqueado: {
    width: 24,
    height: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 12,
  },
  badgeText: {
    fontWeight: '800',
    lineHeight: 15,
  },  tileTitle: {
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 19,
    marginBottom: 3,
  },
  tileDescription: {
    fontWeight: '500',
    lineHeight: 16,
  },
});
