import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, FontSize } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';

export type PaymentMethodKey =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'prepago'
  | 'mixto';

/** Única fuente de etiquetas de método de pago en toda la app. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  prepago: 'Prepago',
  mixto: 'Mixto',
};

/** Única fuente de iconos de método de pago. */
export const PAYMENT_METHOD_ICONS: Record<
  PaymentMethodKey,
  keyof typeof Ionicons.glyphMap
> = {
  efectivo: 'cash-outline',
  tarjeta: 'card-outline',
  transferencia: 'swap-horizontal-outline',
  prepago: 'wallet-outline',
  mixto: 'layers-outline',
};

export function paymentIconFor(
  method?: string | null,
): keyof typeof Ionicons.glyphMap {
  const key = (method || '').toLowerCase() as PaymentMethodKey;
  return PAYMENT_METHOD_ICONS[key] ?? 'wallet-outline';
}

export interface StatusBadgeProps {
  label: string;
  color: string;
  /** Fondo del pill. Por defecto `${color}15`. */
  bg?: string;
  borderColor?: string;
  /** Punto de color delante del texto (estados). */
  dot?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** Color del texto. Por defecto `color`; en estados se suele usar el texto primario. */
  textColor?: string;
  uppercase?: boolean;
  size?: 'xs' | 'sm';
  /** Sin relleno ni borde: solo icono + texto (badge de método en tarjetas). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Pill reutilizable para estados y métodos de pago.
 * Unifica los badges de ventas, pedidos, servicios, clientes y pagos.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  color,
  bg,
  borderColor,
  dot = false,
  icon,
  iconColor,
  textColor,
  uppercase = false,
  size = 'xs',
  bare = false,
  style,
  accessibilityLabel,
}) => (
  <View
    style={[
      styles.badge,
      size === 'sm' && styles.badgeSm,
      bare && styles.bare,
      {
        backgroundColor: bg ?? `${color}15`,
        borderColor: borderColor ?? `${color}30`,
      },
      style,
    ]}
    accessibilityLabel={accessibilityLabel ?? label}
  >
    {dot && <View style={[styles.dot, { backgroundColor: color }]} />}
    {icon && (
      <Ionicons
        name={icon}
        size={size === 'sm' ? 16 : 14}
        color={iconColor ?? color}
        style={styles.icon}
      />
    )}
    <Text
      style={[
        styles.text,
        size === 'sm' && styles.textSm,
        { color: textColor ?? color },
        uppercase && styles.uppercase,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bare: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  icon: { marginRight: 1 },
  text: {
    fontSize: FontSize.xxs,
    fontFamily: FontFamily.extrabold,
  },
  textSm: {
    fontSize: FontSize.xs,
  },
  uppercase: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
