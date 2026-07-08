import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

export const StatCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
}) => {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500 }}
      style={styles.container}
    >
      <LinearGradient
        colors={isDark ? ["#1E293B", "#0F172A"] : ["#FFFFFF", "#F8FAFC"]}
        style={[
          styles.card,
          { borderColor: isDark ? "#334155" : "#E2E8F0", borderWidth: 1 },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
          </View>
          {subtitle ? (
            <View style={styles.trendBadge}>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {subtitle}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>
            {title}
          </Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {value}
          </Text>
        </View>
      </LinearGradient>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "47%",
  },
  card: {
    padding: 16,
    borderRadius: 20,
    height: 130,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  content: {
    marginTop: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "700",
  },
});
