import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";

interface MiniChartProps {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({ data, color, height = 120 }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <View style={[styles.container, { height }]}>
      {data.map((item, index) => (
        <View key={index} style={styles.barWrapper}>
          <MotiView
            from={{ height: 0, opacity: 0 }}
            animate={{
              height: `${(item.value / maxValue) * 100}%`,
              opacity: 1,
            }}
            transition={{ type: "timing", duration: 1000, delay: index * 100 }}
            style={styles.barContainer}
          >
            <LinearGradient
              colors={[color, color + "80"]}
              style={styles.barGradient}
            />
          </MotiView>
          <Text
            style={[styles.barLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 4,
  },
  barContainer: {
    width: "80%",
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barGradient: {
    flex: 1,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
  },
});
