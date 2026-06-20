import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type NewConsumptionsSummaryProps = {
  cart: any[];
  cuentaOriginalTotal: number;
  subtotal: number;
  total: number;
  totalCommission: number;
  hostessDistribution: any[];
  submitting: boolean;
  isDark: boolean;
  accentColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  onSubmit: () => void;
};

export function NewConsumptionsSummary({
  cart,
  cuentaOriginalTotal,
  subtotal,
  total,
  totalCommission,
  hostessDistribution,
  submitting,
  isDark,
  accentColor,
  borderColor,
  textPrimary,
  textSecondary,
  onSubmit,
}: NewConsumptionsSummaryProps) {
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: isDark ? "#111" : "#FFF", borderColor },
      ]}
    >
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Total Original
        </Text>
        <Text style={[styles.summaryVal, { color: textPrimary }]}>
          ${cuentaOriginalTotal.toLocaleString()}
        </Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: textSecondary }]}>
          Nuevos Consumos
        </Text>
        <Text style={[styles.summaryVal, { color: "#E11D48" }]}>
          + ${subtotal.toLocaleString()}
        </Text>
      </View>
      {totalCommission > 0 && (
        <View
          style={[styles.commissionSection, { borderTopColor: borderColor }]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>
              Comision Nuevos Productos
            </Text>
            <Text style={[styles.summaryVal, { color: "#F59E0B" }]}>
              ${totalCommission.toLocaleString()}
            </Text>
          </View>
          {hostessDistribution.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>
                Distribucion por anfitriona
              </Text>
              {hostessDistribution.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.hostessRow,
                    {
                      backgroundColor: isDark
                        ? "rgba(245, 158, 11, 0.10)"
                        : "#FFF7ED",
                      borderColor: isDark
                        ? "rgba(245, 158, 11, 0.25)"
                        : "#FED7AA",
                    },
                  ]}
                >
                  <Text style={[styles.summaryLabel, { color: textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.summaryVal, { color: "#F59E0B" }]}>
                    ${item.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
        <Text style={[styles.totalLabelFinal, { color: textPrimary }]}>
          NUEVO TOTAL
        </Text>
        <Text style={[styles.totalValFinal, { color: accentColor }]}>
          ${total.toLocaleString()}
        </Text>
      </View>

      <Pressable
        style={[
          styles.submitBtn,
          { backgroundColor: cart.length > 0 ? accentColor : "#9CA3AF" },
          submitting && { opacity: 0.7 },
        ]}
        onPress={onSubmit}
        disabled={submitting || cart.length === 0}
        accessibilityLabel="Agregar productos"
        accessibilityRole="button"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Agregar a Cuenta</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, fontWeight: "600" },
  summaryVal: { fontSize: 15, fontWeight: "800" },
  commissionSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  hostessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  totalLabelFinal: { fontSize: 18, fontWeight: "900" },
  totalValFinal: { fontSize: 26, fontWeight: "900" },
  submitBtn: {
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
});
