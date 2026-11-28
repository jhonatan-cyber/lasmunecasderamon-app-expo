import React from "react";
import { CheckoutBarShell } from '@/components/ui/CheckoutBarShell';

interface GarzonCartBarProps {
  itemCount: number;
  cartTotal: number;
  /** Abre el detalle del pedido para revisar y completar sus datos. */
  onViewCart: () => void;
  onBarHeightChange?: (height: number) => void;

  insets: { bottom: number };
  accentColor: string;
  borderColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const GarzonCartBar: React.FC<GarzonCartBarProps> = ({
  itemCount,
  cartTotal,
  onViewCart,
  onBarHeightChange,
  insets,
  accentColor,
  borderColor,
  cardBg,
  textPrimary,
  textSecondary,
}) => (
  <CheckoutBarShell
    itemCount={itemCount}
    totalLabel="producto"
    total={`$${cartTotal.toLocaleString()}`}
    onLayout={(event) => onBarHeightChange?.(event.nativeEvent.layout.height)}
    bottomInset={16 + insets.bottom}
    cardBg={cardBg}
    borderColor={borderColor}
    textPrimary={textPrimary}
    textSecondary={textSecondary}
    accentColor={accentColor}
    submit={{
      label: "Revisar pedido",
      onPress: onViewCart,
      ready: true,
    }}
  />
);
