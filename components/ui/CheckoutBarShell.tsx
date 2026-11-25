import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { useAccentColor } from '@/hooks/useAccentColor';
import { accentTextColor, ensureContrast } from '@/utils/color';
import { haptic } from '@/utils/haptics';

export interface CheckoutSubmit {
  label: string;
  accessibilityLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  submitting?: boolean;
  /** `false` pinta el CTA en superficie secundaria en vez del acento. */
  ready?: boolean;
}

export interface CheckoutBarShellProps {
  itemCount: number;
  totalLabel?: string;
  total: number | string;
  onViewDetails?: () => void;
  viewDetailsLabel?: string;
  leftLabel?: string;
  showItemBadge?: boolean;
  controls?: ReactNode;
  submit: CheckoutSubmit;
  bottomInset: number;
  cardBg?: string;
  borderColor?: string;
  textPrimary?: string;
  textSecondary?: string;
  accentColor?: string;
}

/** Barra inferior compartida: controles opcionales, resumen a la izquierda y CTA a la derecha. */
export const CheckoutBarShell: React.FC<CheckoutBarShellProps> = ({
  itemCount,
  totalLabel = 'ítem',
  total,
  onViewDetails,
  viewDetailsLabel = 'Ver detalle del total',
  leftLabel,
  showItemBadge = true,
  controls,
  submit,
  bottomInset,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
}) => {
  const theme = useAccentColor();
  const bg = cardBg ?? theme.cardBg;
  const border = borderColor ?? theme.borderColor;
  const primary = textPrimary ?? theme.textPrimary;
  const secondary = textSecondary ?? theme.textSecondary;
  const accent = accentColor ?? theme.accentColor;
  const ready = submit.ready ?? true;
  const onAccent = accentTextColor(accent);
  const accentOnCard = ensureContrast(accent, bg, 4.5);

  const handleDetails = () => {
    haptic.tap();
    onViewDetails?.();
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingBottom: Math.max(bottomInset, 12),
        },
      ]}
    >
      {controls}
      <View style={styles.mainRow}>
        <Pressable
          style={styles.left}
          onPress={handleDetails}
          accessibilityRole="button"
          accessibilityLabel={viewDetailsLabel}
          disabled={!onViewDetails}
        >
          {showItemBadge ? (
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${accent}18`, borderColor: `${accent}40` },
                ]}
              >
                <Text style={[styles.badgeText, { color: accentOnCard }]}>
                  {itemCount} {itemCount === 1 ? totalLabel : `${totalLabel}s`}
                </Text>
              </View>
              {onViewDetails && (
                <Ionicons name="chevron-up" size={16} color={secondary} />
              )}
            </View>
          ) : (
            <View style={styles.badgeRow}>
              {!!leftLabel && (
                <Text style={{ color: secondary, fontSize: 12 }}>{leftLabel}</Text>
              )}
              {onViewDetails && (
                <Ionicons name="chevron-forward" size={18} color={secondary} />
              )}
            </View>
          )}
          <Text style={[styles.total, { color: primary }]}>{total}</Text>
        </Pressable>

        <Pressable
          style={[
            styles.submit,
            { backgroundColor: ready ? accent : theme.surfaceMuted },
          ]}
          disabled={submit.disabled}
          onPress={() => {
            if (submit.disabled || submit.submitting) return;
            if (ready) haptic.success();
            submit.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={submit.accessibilityLabel ?? submit.label}
          accessibilityState={{ disabled: !!submit.disabled, busy: !!submit.submitting }}
        >
          {submit.submitting ? (
            <ActivityIndicator color={onAccent} size="small" />
          ) : (
            <>
              <Text
                style={[
                  styles.submitText,
                  { color: ready ? onAccent : secondary },
                ]}
              >
                {submit.label}
              </Text>
              {submit.icon && (
                <Ionicons
                  name={submit.icon}
                  size={18}
                  color={ready ? onAccent : secondary}
                />
              )}
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1, gap: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontFamily: FontFamily.bold },
  total: { fontSize: 22, fontFamily: FontFamily.black },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: BorderRadius.full,
    minWidth: 130,
  },
  submitText: { fontSize: 15, fontFamily: FontFamily.extrabold },
});
