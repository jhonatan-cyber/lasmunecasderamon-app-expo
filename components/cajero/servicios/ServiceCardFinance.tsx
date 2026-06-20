import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ServiceCardFinanceProps {
  metodoPago?: string;
  total: number;
  pagoEstado?: number;
  isFinalizadosTab: boolean;
  textColor: string;
  textMutedColor: string;
  successColor: string;
  dangerColor: string;
}

export const ServiceCardFinance: React.FC<ServiceCardFinanceProps> = ({
  metodoPago,
  total,
  pagoEstado,
  isFinalizadosTab,
  textColor,
  textMutedColor,
  successColor,
  dangerColor,
}) => (
  <View style={styles.financeBox}>
    <View style={styles.paymentMethodBadge}>
      <Ionicons name="card-outline" size={12} color={textMutedColor} />
      <Text style={[styles.paymentMethodText, { color: textMutedColor }]}>
        {metodoPago?.toUpperCase() || "EFECTIVO"}
      </Text>
    </View>
    <View style={styles.financeRight}>
      <Text style={[styles.totalLabel, { color: textMutedColor }]}>TOTAL COBRADO</Text>
      <Text style={[styles.totalPrice, { color: textColor }]}>${total.toLocaleString()}</Text>
      {isFinalizadosTab && (
        <View style={[
          styles.paymentStatusBadge,
          {
            backgroundColor: pagoEstado === 0 ? successColor + '15' : dangerColor + '15',
            borderColor: pagoEstado === 0 ? successColor : dangerColor,
          },
        ]}>
          <Text style={[
            styles.statusLabel,
            { color: pagoEstado === 0 ? successColor : dangerColor, fontSize: 8 },
          ]}>
            {pagoEstado === 0 ? 'PAGADO \u2713' : 'POR PAGAR \u26A0'}
          </Text>
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  financeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '800',
  },
  financeRight: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "900",
  },
  paymentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    marginTop: 4,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "900",
  },
});
