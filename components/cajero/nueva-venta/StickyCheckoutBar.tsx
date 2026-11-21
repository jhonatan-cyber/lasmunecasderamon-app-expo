import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { haptic } from '@/utils/haptics';
import { accentTextColor, ensureContrast } from '@/utils/color';

/** Lo que impide cobrar, para que el botón diga qué falta en vez de un genérico. */
export type CheckoutMissingReason = 'cash' | 'payment' | 'receipt' | null;

interface StickyCheckoutBarProps {
  cart: any[];
  totals: { total: number };
  submitting: boolean;
  cajaAbierta: boolean | null;
  isReadyToSubmit: boolean;
  missingReason: CheckoutMissingReason;
  isDark: boolean;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  bottomInset: number;
  scrollRef: React.RefObject<any>;
  onSubmit: () => void;
}

/**
 * Texto, etiqueta accesible e icono del CTA según lo que falte. Se expone
 * aparte para poder probar la matriz sin renderizar la pantalla completa.
 */
export function resolveCheckoutCta(
  isReadyToSubmit: boolean,
  missingReason: CheckoutMissingReason,
): { label: string; accessibilityLabel: string; icon: keyof typeof Ionicons.glyphMap } {
  if (isReadyToSubmit) {
    return {
      label: 'Cobrar',
      accessibilityLabel: 'Finalizar venta',
      icon: 'checkmark-circle',
    };
  }

  switch (missingReason) {
    case 'cash':
      return {
        label: 'Caja cerrada',
        accessibilityLabel: 'Caja cerrada: abrí la caja para poder cobrar',
        icon: 'lock-closed-outline',
      };
    case 'receipt':
      return {
        label: 'Falta baucher',
        accessibilityLabel: 'Falta el baucher de la transferencia',
        icon: 'camera-outline',
      };
    default:
      return {
        label: 'Elegir pago',
        accessibilityLabel: 'Elegir método de pago',
        icon: 'arrow-down',
      };
  }
}

/**
 * Barra sticky en la parte inferior con total y botón de cobrar.
 * Extraído de nueva-venta.tsx para reducir el tamaño del screen.
 */
export const StickyCheckoutBar: React.FC<StickyCheckoutBarProps> = ({
  cart,
  totals,
  submitting,
  cajaAbierta,
  isReadyToSubmit,
  missingReason,
  isDark,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  accentColor,
  bottomInset,
  scrollRef,
  onSubmit,
}) => {
  const itemCount = cart.reduce((s, i) => s + (i.quantity || 1), 0);
  const cta = resolveCheckoutCta(isReadyToSubmit, missingReason);
  // Texto sobre el acento (Cobrar) y acento como texto sobre la tarjeta.
  const onAccent = accentTextColor(accentColor);
  const accentTextSafe = ensureContrast(accentColor, cardBg, 4.5);

  const handleScrollToEnd = () => {
    haptic.tap();
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View
      style={[
        styles.stickyCheckoutBar,
        {
          backgroundColor: cardBg,
          borderColor,
          paddingBottom: Math.max(bottomInset, 12),
        },
      ]}
    >
      <Pressable
        style={styles.stickyLeft}
        onPress={handleScrollToEnd}
        accessibilityRole="button"
        accessibilityLabel="Ver detalle del total"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={[
              styles.stickyBadge,
              { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}40` },
            ]}
          >
            <Text style={[styles.stickyBadgeText, { color: accentTextSafe }]}>
              {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
            </Text>
          </View>
          <Ionicons name="chevron-up" size={16} color={textSecondary} />
        </View>
        <Text style={[styles.stickyTotal, { color: textPrimary }]}>
          ${totals.total.toLocaleString()}
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.stickySubmitBtn,
          {
            backgroundColor: isReadyToSubmit
              ? accentColor
              : isDark
                ? '#262626'
                : '#E5E7EB',
          },
        ]}
        disabled={submitting || cajaAbierta === false}
        onPress={() => {
          if (isReadyToSubmit) {
            haptic.success();
            onSubmit();
          } else {
            handleScrollToEnd();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={cta.accessibilityLabel}
      >
        {submitting ? (
          <ActivityIndicator color={onAccent} size="small" />
        ) : (
          <>
            <Text
              style={[
                styles.stickySubmitText,
                {
                  color: isReadyToSubmit
                    ? onAccent
                    : isDark
                      ? '#A3A3A3'
                      : '#4B5563',
                },
              ]}
            >
              {cta.label}
            </Text>
            <Ionicons
              name={cta.icon}
              size={18}
              color={
                isReadyToSubmit
                  ? onAccent
                  : isDark
                    ? '#A3A3A3'
                    : '#4B5563'
              }
            />
          </>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  stickyCheckoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  stickyLeft: {
    flex: 1,
    gap: 2,
  },
  stickyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  stickyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stickyTotal: {
    fontSize: 22,
    fontWeight: '900',
  },
  stickySubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 16,
    minWidth: 130,
  },
  stickySubmitText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
