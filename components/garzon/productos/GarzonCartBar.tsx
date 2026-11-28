import React from "react";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { Image } from "expo-image";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MetodoPagoPedido } from "@/types/cart";
import { useAccentColor } from '@/hooks/useAccentColor';
import { PaymentMethodSelect } from '@/components/cajero/forms/PaymentMethodSelect';
import { CheckoutBarShell } from '@/components/ui/CheckoutBarShell';

/** Los tres métodos que el dashboard acepta al crear el pedido. */
const METODOS_PAGO_PEDIDO: MetodoPagoPedido[] = [
  "efectivo",
  "tarjeta",
  "transferencia",
];

interface GarzonCartBarProps {
  itemCount: number;
  tipEnabled: boolean;
  setTipEnabled: (enabled: boolean) => void;
  metodoPago: MetodoPagoPedido;
  setMetodoPago: (metodo: MetodoPagoPedido) => void;
  /** Foto del baucher en data URL; solo aplica cuando el pago es transferencia. */
  baucherFoto: string | null;
  /** Abre la cámara para sacar (o repetir) la foto del baucher. */
  onTakeBaucherPhoto: () => void;
  tipAmount: number;
  tipPercentage?: number;
  cartTotal: number;
  submitting: boolean;
  submitOrder: () => void;
  /** Abre la vista/modal con el detalle del pedido. */
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
  tipEnabled,
  setTipEnabled,
  metodoPago,
  setMetodoPago,
  baucherFoto,
  onTakeBaucherPhoto,
  tipAmount,
  tipPercentage = 10,
  cartTotal,
  submitting,
  submitOrder,
  onViewCart,
  onBarHeightChange,
  insets,
  accentColor,
  borderColor,
  cardBg,
  textPrimary,
  textSecondary,
}) => {
  const { accentOnSurface, accentColor: themeAccent } = useAccentColor();
  const [controlsExpanded, setControlsExpanded] = React.useState(false);
  const tipSummary = tipEnabled ? `Propina ${tipPercentage}%` : "Propina inactiva";
  const receiptSummary = metodoPago === "transferencia"
    ? baucherFoto
      ? " · Comprobante adjunto"
      : " · Falta comprobante"
    : "";
  const optionsLabel = `Editar pago y propina: ${tipSummary} · Pago ${metodoPago}${receiptSummary}`;

  const controls = (
    <>
      <Pressable
        onPress={() => setControlsExpanded((expanded) => !expanded)}
        style={styles.optionsToggle}
        accessibilityRole="button"
        accessibilityLabel={optionsLabel}
        accessibilityHint={controlsExpanded ? "Oculta las opciones de pago y propina" : "Muestra las opciones de pago y propina"}
        accessibilityState={{ expanded: controlsExpanded }}
      >
        <Text style={[styles.optionsSummary, { color: textSecondary }]}>
          {tipSummary} · Pago {metodoPago}{receiptSummary}
        </Text>
        <Ionicons
          name={controlsExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={textSecondary}
        />
      </Pressable>

      {metodoPago === "transferencia" && (
        <Pressable
          onPress={onTakeBaucherPhoto}
          accessibilityRole="button"
          accessibilityLabel={
            baucherFoto
              ? "Repetir foto del baucher"
              : "Sacar foto del baucher (obligatoria)"
          }
          accessibilityHint={baucherFoto ? "Abre la cámara para reemplazar el comprobante" : "Abre la cámara para adjuntar el comprobante obligatorio"}
          style={[
            styles.baucherRow,
            {
              borderColor: baucherFoto ? accentColor : themeAccent,
              backgroundColor: baucherFoto ? `${accentColor}1A` : `${themeAccent}1A`,
            },
          ]}
        >
          {baucherFoto ? (
            <Image source={{ uri: baucherFoto }} style={styles.baucherThumb} />
          ) : (
            <Ionicons name="camera-outline" size={20} color={themeAccent} />
          )}
          <Text
            style={[
              styles.baucherText,
              { color: baucherFoto ? accentColor : themeAccent },
            ]}
          >
            {baucherFoto
              ? "Comprobante adjunto · tocar para reemplazar"
              : "Adjuntar comprobante obligatorio"}
          </Text>
        </Pressable>
      )}

      {controlsExpanded && (
        <View style={styles.expandedControls}>
          <View style={styles.cartTopRow}>
            <View style={styles.tipControl}>
              <Text style={[styles.tipText, { color: textSecondary }]}>Propina ({tipPercentage}%)</Text>
              <Pressable
                onPress={() => setTipEnabled(!tipEnabled)}
                accessibilityRole="button"
                accessibilityLabel={tipEnabled ? "Desactivar propina" : "Activar propina"}
                accessibilityState={{ selected: tipEnabled }}
              >
                <Text style={{ color: accentOnSurface, fontFamily: FontFamily.semibold }}>
                  {tipEnabled ? "Activa" : "Inactiva"} · ${tipAmount.toLocaleString()}
                </Text>
              </Pressable>
            </View>
            {tipEnabled && (
              <Text style={[styles.tipAmount, { color: accentOnSurface }]}>+${tipAmount.toLocaleString()}</Text>
            )}
          </View>

          <View style={styles.paymentRow}>
            <Text style={[styles.paymentLabel, { color: textSecondary }]}>Pago</Text>
            <View style={styles.paymentOptions}>
              <PaymentMethodSelect
                showLabel={false}
                variant="compact"
                methods={METODOS_PAGO_PEDIDO}
                selectedMethod={metodoPago}
                onSelect={(metodo) => setMetodoPago(metodo as MetodoPagoPedido)}
                getAccessibilityLabel={(metodo) => `Pago ${metodo}`}
              />
            </View>
          </View>
        </View>
      )}
    </>
  );

  return (
    <CheckoutBarShell
      itemCount={itemCount}
      totalLabel="producto"
      total={`$${cartTotal.toLocaleString()}`}
      onViewDetails={onViewCart}
      viewDetailsLabel="Ver detalle del pedido"
      controls={controls}
      onLayout={(event) => onBarHeightChange?.(event.nativeEvent.layout.height)}
      bottomInset={16 + insets.bottom}
      cardBg={cardBg}
      borderColor={borderColor}
      textPrimary={textPrimary}
      textSecondary={textSecondary}
      accentColor={accentColor}
      submit={{
        label: "Enviar Pedido",
        onPress: submitOrder,
        disabled: submitting,
        submitting,
        ready: true,
      }}
    />
  );
};

const styles = StyleSheet.create({
  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  optionsToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  optionsSummary: { flex: 1, fontSize: 12, fontFamily: FontFamily.semibold },
  expandedControls: { paddingBottom: 4 },
  cartTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tipControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipText: { fontSize: 13, fontFamily: FontFamily.semibold },
  tipAmount: { fontSize: 13, fontFamily: FontFamily.bold },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  paymentLabel: { fontSize: 12, fontFamily: FontFamily.semibold },
  paymentOptions: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  baucherRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  baucherThumb: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
  },
  baucherText: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: FontFamily.bold,
  },
  cartMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  cartInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  cartAmountColumn: {
    gap: 2,
  },
  cartLabel: { fontSize: 12, fontFamily: FontFamily.semibold },
  cartTotal: { fontSize: 24, fontFamily: FontFamily.black, letterSpacing: -0.5 },
  submitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.full },
  submitText: { color: "#FFF", fontSize: 16, fontFamily: FontFamily.bold },
});
