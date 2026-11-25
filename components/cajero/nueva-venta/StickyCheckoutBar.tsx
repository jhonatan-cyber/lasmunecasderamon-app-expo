import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { haptic } from '@/utils/haptics';
import { CheckoutBarShell } from '@/components/ui/CheckoutBarShell';

/** Lo que impide cobrar, para que el botón diga qué falta en vez de un genérico. */
export type CheckoutMissingReason = 'cash' | 'payment' | 'receipt' | null;

interface StickyCheckoutBarProps {
  cart: any[];
  totals: { total: number };
  submitting: boolean;
  cajaAbierta: boolean | null;
  isReadyToSubmit: boolean;
  missingReason: CheckoutMissingReason;
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

/** Barra sticky en la parte inferior con total y botón de cobrar. */
export const StickyCheckoutBar: React.FC<StickyCheckoutBarProps> = ({
  cart,
  totals,
  submitting,
  cajaAbierta,
  isReadyToSubmit,
  missingReason,
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

  const scrollToEnd = () => {
    haptic.tap();
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <CheckoutBarShell
      itemCount={itemCount}
      totalLabel="ítem"
      total={`$${totals.total.toLocaleString()}`}
      onViewDetails={scrollToEnd}
      viewDetailsLabel="Ver detalle del total"
      bottomInset={bottomInset}
      cardBg={cardBg}
      borderColor={borderColor}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      accentColor={accentColor}
      submit={{
        label: cta.label,
        accessibilityLabel: cta.accessibilityLabel,
        icon: cta.icon,
        ready: isReadyToSubmit,
        submitting,
        disabled: cajaAbierta === false,
        onPress: isReadyToSubmit
          ? () => {
              haptic.success();
              onSubmit();
            }
          : scrollToEnd,
      }}
    />
  );
};
