import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TipMetricCardsProps {
  totalPendiente: number;
  totalGeneral: number;
  pendientesCount: number;

  accentColor: string;
  borderColor: string;
  cardBg: string;
  textSecondary: string;
}

export const TipMetricCards: React.FC<TipMetricCardsProps> = ({
  totalPendiente,
  totalGeneral,
  pendientesCount,
  accentColor,
  borderColor,
  cardBg,
  textSecondary,
}) => {
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: cardBg, borderColor, shadowColor: accentColor },
      ]}
    >
      <Text style={[styles.summaryLabel, { color: textSecondary }]}>
        PROPINAS PENDIENTES
      </Text>
      <Text style={[styles.summaryAmount, { color: accentColor }]}>
        ${totalPendiente.toLocaleString()}
      </Text>
      <View style={styles.summaryDetails}>
        <Text style={[styles.summaryDetail, { color: textSecondary }]}>
          Recibido: ${totalGeneral.toLocaleString()}
        </Text>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <Text style={[styles.summaryDetail, { color: textSecondary }]}>
          Items: {pendientesCount}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  summaryAmount: {
    fontSize: 38,
    fontWeight: "900",
    marginBottom: 12,
  },
  summaryDetails: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  summaryDetail: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 12,
    alignSelf: "center",
  },
});
