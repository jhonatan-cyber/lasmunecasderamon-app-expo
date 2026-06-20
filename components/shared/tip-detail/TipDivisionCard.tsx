import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";

interface TipDivisionCardProps {
  montoTotal: number;
  conteoUsuarios: number | null | undefined;
  monto: number;
}

export const TipDivisionCard: React.FC<TipDivisionCardProps> = ({
  montoTotal,
  conteoUsuarios,
  monto,
}) => {
  const { accentColor, isDark } = useAccentColor();
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.05)";

  return (
    <View
      style={[
        styles.card,
        {
          borderColor,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.02)",
        },
      ]}
    >
      <View style={styles.item}>
        <Text style={[styles.label, { color: textSecondary }]}>
          Total Propina
        </Text>
        <Text style={[styles.value, { color: textPrimary }]}>
          ${montoTotal.toLocaleString()}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[styles.label, { color: textSecondary }]}>
          Participantes
        </Text>
        <Text style={[styles.value, { color: accentColor }]}>
          {conteoUsuarios ?? "---"}
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Text style={[styles.label, { color: textSecondary }]}>Mi Parte</Text>
        <Text style={[styles.value, { color: accentColor }]}>
          ${monto.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: { flex: 1, alignItems: "center" },
  label: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  value: { fontSize: 16, fontWeight: "800" },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(155,155,155,0.2)",
  },
});
