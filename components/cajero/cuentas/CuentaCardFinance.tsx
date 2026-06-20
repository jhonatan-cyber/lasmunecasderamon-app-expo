import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CuentaCardFinanceProps {
  total: number;
  statusValue: number;
  paymentMethodText: string | null;
  isPartialPending: boolean;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
}

export const CuentaCardFinance: React.FC<CuentaCardFinanceProps> = ({
  total,
  statusValue,
  paymentMethodText,
  isPartialPending,
  textPrimary,
  textSecondary,
  isDark,
}) => {
  const financeText =
    statusValue === 1
      ? "Por cobrar"
      : statusValue === 0
        ? paymentMethodText || "Cobrado"
        : statusValue === 2
          ? "Solicitud de anulacion"
          : statusValue === 4
            ? "Saldo pendiente"
            : "Anulado";

  return (
    <>
      <View style={styles.financeBox}>
        <View style={styles.financePill}>
          <Ionicons name="card-outline" size={12} color={textSecondary} />
          <Text style={[styles.financePillText, { color: textSecondary }]}>
            {financeText}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.totalLabelText, { color: textSecondary }]}>
            TOTAL
          </Text>
          <Text style={[styles.totalValueText, { color: textPrimary }]}>
            ${total.toLocaleString()}
          </Text>
        </View>
      </View>
      {isPartialPending && (
        <View
          style={[
            styles.partialPendingRow,
            {
              borderColor: isDark
                ? "rgba(251, 146, 60, 0.35)"
                : "#FDBA74",
              backgroundColor: isDark
                ? "rgba(251, 146, 60, 0.12)"
                : "#FFF7ED",
            },
          ]}
        >
          <Text style={styles.partialPendingLabel}>SALDO RESTANTE</Text>
          <Text style={styles.partialPendingValue}>
            ${total.toLocaleString("es-CL")}
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  financeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  financePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(156, 163, 175, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  financePillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  totalLabelText: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalValueText: {
    fontSize: 20,
    fontWeight: "900",
  },
  partialPendingRow: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  partialPendingLabel: {
    color: "#F59E0B",
    fontWeight: "800",
    fontSize: 12,
  },
  partialPendingValue: {
    color: "#F59E0B",
    fontWeight: "900",
    fontSize: 18,
  },
});
