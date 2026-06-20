import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CalendarLegendProps {
  typeColors: Record<string, string>;
  textSecondary: string;
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({
  typeColors,
  textSecondary,
}) => (
  <View style={styles.legend}>
    {Object.entries(typeColors).map(([type, color]) => (
      <View key={type} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={[styles.legendText, { color: textSecondary }]}>
          {type === "hora_extra"
            ? "Hora extra"
            : type.charAt(0).toUpperCase() + type.slice(1)}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "600" },
});
