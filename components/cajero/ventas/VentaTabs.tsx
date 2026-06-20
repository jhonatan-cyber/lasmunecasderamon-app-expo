import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type VentaTabsProps = {
  activeTab: "historial" | "proceso";
  onTabChange: (tab: "historial" | "proceso") => void;
  accentColor: string;
  isDark: boolean;
  isTablet: boolean;
  activeTimerCount: number;
};

export function VentaTabs({
  activeTab,
  onTabChange,
  accentColor,
  isDark,
  isTablet,
  activeTimerCount,
}: VentaTabsProps) {
  return (
    <View
      style={[
        styles.tabContainer,
        {
          backgroundColor: "transparent",
          borderColor: "transparent",
          height: isTablet ? 56 : 48,
          marginHorizontal: 16,
          marginTop: 15,
          gap: 12,
        },
      ]}
    >
      <Pressable
        style={[
          styles.tab,
          activeTab === "historial"
            ? { backgroundColor: accentColor }
            : { borderWidth: 1, borderColor: accentColor + "30" },
        ]}
        onPress={() => onTabChange("historial")}
      >
        <Text
          style={[
            styles.tabText,
            isTablet && { fontSize: 16 },
            activeTab === "historial"
              ? { color: "#FFF" }
              : { color: isDark ? "#9CA3AF" : "#64748B" },
          ]}
        >
          Listado de Ventas
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.tab,
          activeTab === "proceso"
            ? { backgroundColor: accentColor }
            : { borderWidth: 1, borderColor: accentColor + "30" },
        ]}
        onPress={() => onTabChange("proceso")}
      >
        <View style={styles.tabWithBadge}>
          <Text
            style={[
              styles.tabText,
              isTablet && { fontSize: 16 },
              activeTab === "proceso"
                ? { color: "#FFF" }
                : { color: isDark ? "#9CA3AF" : "#64748B" },
            ]}
          >
            Ventas con Habitación
          </Text>
          {activeTimerCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{activeTimerCount}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(155,155,155,0.05)",
    borderRadius: 9999,
    padding: 4,
    marginTop: 15,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    height: 40,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  tabBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
  },
});
