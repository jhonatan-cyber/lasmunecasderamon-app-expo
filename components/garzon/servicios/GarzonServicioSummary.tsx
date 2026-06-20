import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Totales {
  subtotal: number;
  totalHabitacion: number;
  total: number;
  iva: number;
  comisionPorAnfitriona: number;
}

interface GarzonServicioSummaryProps {
  totals: Totales;
  hasComision: boolean | null;
  selectedHostessesCount: number;
  paymentMethod: string;
  primaryColor: string;
  textPrimary: string;
  textSecondary: string;
}

export const GarzonServicioSummary: React.FC<GarzonServicioSummaryProps> = ({
  totals,
  hasComision,
  selectedHostessesCount,
  paymentMethod,
  primaryColor,
  textPrimary,
  textSecondary,
}) => {
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: primaryColor + "15", borderColor: primaryColor },
      ]}
    >
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Subtotal:
        </Text>
        <Text style={[styles.summaryValue, { color: textPrimary }]}>
          ${totals.subtotal.toLocaleString()}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Habitación:
        </Text>
        <Text style={[styles.summaryValue, { color: textPrimary }]}>
          ${totals.totalHabitacion.toLocaleString()}
        </Text>
      </View>
      {hasComision && selectedHostessesCount > 0 && (
        <View
          style={[
            styles.summaryRow,
            {
              marginTop: 4,
              paddingTop: 4,
              borderTopWidth: 1,
              borderTopColor: primaryColor + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.summaryLabel,
              { color: "#10B981", fontWeight: "800" },
            ]}
          >
            Comisión p/Anf:
          </Text>
          <Text
            style={[
              styles.summaryValue,
              { color: "#10B981", fontWeight: "800" },
            ]}
          >
            ${totals.comisionPorAnfitriona.toLocaleString()} x{" "}
            {selectedHostessesCount}
          </Text>
        </View>
      )}
      {paymentMethod === "tarjeta" && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: textSecondary }]}>
            IVA/Ajuste:
          </Text>
          <Text style={[styles.summaryValue, { color: textPrimary }]}>
            ${totals.iva.toLocaleString()}
          </Text>
        </View>
      )}
      <View style={[styles.totalRow, { borderTopColor: primaryColor + "30" }]}>
        <Text style={[styles.totalLabel, { color: textPrimary }]}>TOTAL</Text>
        <Text style={[styles.totalAmount, { color: primaryColor }]}>
          ${totals.total.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginVertical: 20,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "900",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "900",
  },
});
