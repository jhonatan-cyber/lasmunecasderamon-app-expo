import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { MetodoPagoPedido } from "@/types/cart";

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
  insets,
  accentColor,
  borderColor,
  cardBg,
  textPrimary,
  textSecondary,
}) => {
  return (
    <View
      style={[
        styles.cartBar,
        {
          backgroundColor: cardBg,
          borderTopColor: borderColor,
          paddingBottom: 16 + insets.bottom,
        },
      ]}
    >
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
            <Text style={{ color: accentColor, fontWeight: "600" }}>
              {tipEnabled ? "Activa" : "Inactiva"} · $
              {tipAmount.toLocaleString()}
            </Text>
          </Pressable>
        </View>
        {tipEnabled && (
          <Text style={[styles.tipAmount, { color: accentColor }]}>
            +${tipAmount.toLocaleString()}
          </Text>
        )}
      </View>

      <View style={styles.paymentRow}>
        <Text style={[styles.paymentLabel, { color: textSecondary }]}>Pago</Text>
        <View style={styles.paymentOptions}>
          {METODOS_PAGO_PEDIDO.map((metodo) => {
            const selected = metodoPago === metodo;
            return (
              <Pressable
                key={metodo}
                onPress={() => setMetodoPago(metodo)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Pago ${metodo}`}
                style={[
                  styles.paymentChip,
                  { borderColor: selected ? accentColor : borderColor },
                  selected && { backgroundColor: `${accentColor}1A` },
                ]}
              >
                <Text
                  style={[
                    styles.paymentChipText,
                    { color: selected ? accentColor : textSecondary },
                  ]}
                >
                  {metodo}
                </Text>
              </Pressable>
            );
          })}
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
              borderColor: baucherFoto ? accentColor : "#EF4444",
              backgroundColor: baucherFoto ? `${accentColor}1A` : "#EF44441A",
            },
          ]}
        >
          {baucherFoto ? (
            <Image source={{ uri: baucherFoto }} style={styles.baucherThumb} />
          ) : (
            <Ionicons name="camera-outline" size={20} color="#EF4444" />
          )}
          <Text
            style={[
              styles.baucherText,
              { color: baucherFoto ? accentColor : "#EF4444" },
            ]}
          >
            {baucherFoto
              ? "Baucher adjunto · tocar para repetir"
              : "Sacar foto del baucher (obligatoria)"}
          </Text>
        </Pressable>
      )}

      <View style={styles.cartMainRow}>
        <View>
          <Text style={[styles.cartLabel, { color: textSecondary }]}>
            Total Pedido
          </Text>
          <Text style={[styles.cartTotal, { color: textPrimary }]}>
            ${cartTotal.toLocaleString()}
          </Text>
        </View>
        <Pressable
          onPress={submitOrder}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Enviar Pedido"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: accentColor },
            submitting && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Enviar Pedido</Text>
          )}
        </Pressable>
      </View>
    </View>
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
  tipText: { fontSize: 13, fontWeight: "600" },
  tipAmount: { fontSize: 13, fontWeight: "700" },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  paymentLabel: { fontSize: 12, fontWeight: "600" },
  paymentOptions: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 1,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  paymentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  paymentChipText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  baucherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  baucherThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  baucherText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  cartMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cartLabel: { fontSize: 12, fontWeight: "600" },
  cartTotal: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  submitBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
