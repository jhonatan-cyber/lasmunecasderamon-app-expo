import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useResponsiveMetrics } from '@/hooks/useResponsiveMetrics';
import { readableTextColor, withAlpha } from '@/utils/color';

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
    isBlackAccent,
    cardBg,
    textPrimary,
    textSecondary,
    borderColor: themeBorder,
    surfaceMuted,
    bg,
    accentText,
  } = useAccentColor();
  const { isTablet } = useResponsiveMetrics();
  const reducedMotion = useReducedMotion();

  const showBadge = typeof badge === 'number' && badge > 0;
  const badgeText = showBadge ? (badge as number) > 99 ? '99+' : String(badge) : '';

  const accessibilityLabel = bloqueado
    ? `${title}: ${description}. Requiere una caja abierta`
    : showBadge
      ? `${title}: ${description}. ${badge} ${badgeLabel ?? 'pendientes'}`
      : `${title}: ${description}`;

  // Animación de pulso del badge cuando hay contador
  const badgeScale = useSharedValue(1);
  const triggerPulse = () => {
    if (reducedMotion) {
      return;
    }
    badgeScale.value = withSequence(
      withTiming(1.15, { duration: 150 }),
      withTiming(1, { duration: 150 }),
    );
  };

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  // Unificar maxFontSizeMultiplier a 1.5 en todos los textos

  const iconSize = isTablet ? 30 : 24;
  const titleSize = FontSize.sm;
  const descSize = FontSize.xs;
  const padding = isTablet ? 18 : 14;
  // Cuando el tema de la app es negro, los íconos siempre son blancos tanto en
  // modo claro como oscuro, sin importar el color individual de cada card.
  // En estado bloqueado (caja cerrada), el ícono se atenúa con alpha para
  // mantener coherencia visual con la variante tile.
  const rowIconColor = disabled
    ? textSecondary
    : bloqueado
      ? isBlackAccent
        ? withAlpha(accentText, 0.45)
        : withAlpha(color, 0.45)
      : isBlackAccent
        ? accentText
        : color;

  // Borde neón en modo oscuro: aplica a ambas variantes (tile y row).
  const neonBorder = isDark && !disabled && !bloqueado
    ? {
        borderColor: color,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
      }
    : {};

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
            borderLeftColor: disabled ? themeBorder : color,
            ...neonBorder,
          },
        ]}
      >
        <View style={styles.content}>
          {/* Icon in top-left corner */}
          <Ionicons
            name={icon}
            size={isTablet ? 30 : 22}
            color={rowIconColor}
          />

          {/* Text content */}
          <View style={styles.textContainer}>
            {/* Title as main element */}
            <Text
              maxFontSizeMultiplier={1.5}
              numberOfLines={2}
              style={[
                styles.mainTitle,
                {
                  fontSize: isTablet ? 20 : FontSize.sm,
                  color: disabled ? textSecondary : textPrimary,
                },
              ]}
            >
              {title}
            </Text>

            {/* Description below title */}
            <Text
              maxFontSizeMultiplier={1.5}
              numberOfLines={2}
              style={[
                styles.subDescription,
                {
                  fontSize: isTablet ? 14 : FontSize.xs,
                  color: disabled ? textSecondary : textSecondary,
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
  const mutedColor = textSecondary;
  const chipBg = disabled
    ? withAlpha(mutedColor, isDark ? 0.16 : 0.12)
    : bloqueado
      ? withAlpha(color, isDark ? 0.12 : 0.08)
      : withAlpha(color, isDark ? 0.22 : 0.14);
  const iconColor = disabled
    ? mutedColor
    : isBlackAccent
      ? bloqueado ? withAlpha(accentText, 0.45) : accentText
      : bloqueado
        ? withAlpha(readableTextColor(color), 0.45)
        : readableTextColor(color);

  // Overlay de patrón diagonal para cards bloqueadas
  const blockedPatternStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.card,
    opacity: 0.04,
    borderWidth: 1,
    borderColor: isDark ? accentText : bg,
    borderStyle: 'dashed' as const,
  };

  // Chip mejorado con borde sutil y glow interno en modo oscuro
  const chipBorder = {
    borderWidth: 1,
    borderColor: withAlpha(color, isDark ? 0.35 : 0.2),
  };
  const chipInnerGlow = isDark ? {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  } : {};

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
          minHeight: isTablet ? 150 : 110,
          opacity: disabled ? 0.45 : 1,
          ...neonBorder,
        },
      ]}
    >
      {/* Overlay de patrón para cards bloqueadas */}
      {bloqueado && <View style={blockedPatternStyle} />}
      <View style={styles.tileHeader}>
        <View
          style={[
            styles.chip,
            chipBorder,
            chipInnerGlow,
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
          <Animated.View style={[styles.badge, styles.badgeBloqueado, { backgroundColor: surfaceMuted }, badgeAnimatedStyle]}>
            <Ionicons
              name="lock-closed"
              size={isTablet ? 13 : 11}
              color={textSecondary}
            />
          </Animated.View>
        ) : (
          showBadge && (
            <Animated.View
              style={[
                styles.badge,
                {
                  backgroundColor: disabled ? mutedColor : color,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.35)',
                },
                badgeAnimatedStyle,
              ]}
              onTouchStart={triggerPulse}
            >
              <Text
                maxFontSizeMultiplier={1.5}
                style={[
                  styles.badgeText,
                  {
                    color: disabled
                      ? readableTextColor(mutedColor)
                      : readableTextColor(color),
                    fontSize: isTablet ? 13 : FontSize.xxs,
                  },
                ]}
              >
                {badgeText}
              </Text>
            </Animated.View>
          )
        )}
      </View>

      <Text
        maxFontSizeMultiplier={1.5}
        numberOfLines={2}
        style={[
          styles.tileTitle,
          {
            fontSize: titleSize,
            color: disabled ? textSecondary : textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <Text
        maxFontSizeMultiplier={1.5}
        numberOfLines={2}
        style={[
          styles.tileDescription,
          {
            fontSize: descSize,
            color: disabled ? textSecondary : textSecondary,
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
    fontFamily: FontFamily.bold,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  subDescription: {
    fontFamily: FontFamily.medium,
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
    overflow: 'hidden',
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
    overflow: 'hidden',
  },
  badge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeBloqueado: {
    width: 24,
    height: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: FontFamily.extrabold,
    lineHeight: 15,
  },  tileTitle: {
    fontFamily: FontFamily.extrabold,
    letterSpacing: 0.2,
    lineHeight: 19,
    marginBottom: 3,
  },
  tileDescription: {
    fontFamily: FontFamily.medium,
    lineHeight: 16,
  },
});
