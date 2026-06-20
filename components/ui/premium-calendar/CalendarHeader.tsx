import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface CalendarHeaderProps {
  currentMonth: Date;
  textPrimary: string;
  textSecondary: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  textPrimary,
  textSecondary,
  onPrevMonth,
  onNextMonth,
}) => (
  <View style={styles.calTop}>
    <Text style={[styles.calMonth, { color: textPrimary }]}>
      {currentMonth.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      })}
    </Text>
    <View style={styles.calNav}>
      <Pressable onPress={onPrevMonth} style={styles.navBtn} accessibilityLabel="Mes anterior" accessibilityRole="button">
        <Ionicons name="chevron-back" size={20} color={textPrimary} />
      </Pressable>
      <Pressable onPress={onNextMonth} style={styles.navBtn} accessibilityLabel="Mes siguiente" accessibilityRole="button">
        <Ionicons name="chevron-forward" size={20} color={textPrimary} />
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  calTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calMonth: { fontSize: 16, fontWeight: "800", textTransform: "capitalize" },
  calNav: { flexDirection: "row", gap: 15 },
  navBtn: { padding: 8 },
});
