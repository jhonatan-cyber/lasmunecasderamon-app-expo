import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CardFinance } from "@/components/ui/CardFinance";

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
    <CardFinance
      total={total}
      pillText={financeText}
      label="TOTAL"
      textColor={textPrimary}
      textMutedColor={textSecondary}
    >
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
    </CardFinance>
  );
};

const styles = StyleSheet.create({
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
