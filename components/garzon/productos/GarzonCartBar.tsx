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

  insets: { bottom: number };
  accentColor: string;
  borderColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
}

export const GarzonCartBar: React.FC<GarzonCartBarProps> = ({
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
  insets,
  accentColor,
  borderColor,
  cardBg,
  textPrimary,
  textSecondary,
}) => {
  const { accentOnSurface, accentColor: themeAccent } = useAccentColor();

  const controls = (
    <>
      <View style={styles.cartTopRow}>
        <View style={styles.tipControl}>
          <Text style={[styles.tipText, { color: textSecondary }]}>
            Propina ({tipPercentage}%)
          </Text>
          <Pressable
            onPress={() => setTipEnabled(!tipEnabled)}
            accessibilityRole="button"
            accessibilityState={{ selected: tipEnabled }}
          >
            <Text style={{ color: accentOnSurface, fontFamily: FontFamily.semibold }}>
              {tipEnabled ? "Activa" : "Inactiva"} · $
              {tipAmount.toLocaleString()}
            </Text>
          </Pressable>
        </View>
        {tipEnabled && (
          <Text style={[styles.tipAmount, { color: accentOnSurface }]}>
            +${tipAmount.toLocaleString()}
          </Text>
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

      {metodoPago === "transferencia" && (
        <Pressable
          onPress={onTakeBaucherPhoto}
          accessibilityRole="button"
          accessibilityLabel={
            baucherFoto
              ? "Repetir foto del baucher"
              : "Sacar foto del baucher (obligatoria)"
          }
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
              ? "Baucher adjunto · tocar para repetir"
              : "Sacar foto del baucher (obligatoria)"}
          </Text>
        </Pressable>
      )}
    </>
  );

  return (
    <CheckoutBarShell
      itemCount={0}
      showItemBadge={false}
      leftLabel="Total Pedido"
      total={`$${cartTotal.toLocaleString()}`}
      onViewDetails={onViewCart}
      viewDetailsLabel="Ver detalle del pedido"
      controls={controls}
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
  cartTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tipControl: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipText: { fontSize: 13, fontFamily: FontFamily.semibold },
  tipAmount: { fontSize: 13, fontFamily: FontFamily.bold },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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
