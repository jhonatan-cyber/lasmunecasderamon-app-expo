import { useRouter, type Href } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Spacing } from "@/constants";
import { useAccentColor } from "@/hooks/useAccentColor";
import { GarzonActionCard } from "@/components/garzon/GarzonActionCard";

export const BarmanActionGrid = ({
  fullWidth = false,
}: {
  fullWidth?: boolean;
}) => {
  const { accentColor } = useAccentColor();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const cols = isTablet ? 3 : 2;
  const spacing = isTablet ? 24 : 16;
  const actions = [
    {
      title: "BAR",
      description: "Stock y transferencias",
      icon: "beer" as const,
      color: accentColor,
      route: "/barman/bar",
    },
    {
      title: "VENTAS",
      description: "Ventas del día",
      icon: "cart" as const,
      color: accentColor,
      route: "/barman/ventas",
    },
    {
      title: "SERVICIOS",
      description: "Gestión de privados",
      icon: "bed" as const,
      color: accentColor,
      route: "/barman/servicios",
    },
  ];

  const rows = [];
  for (let i = 0; i < actions.length; i += cols) {
    rows.push(actions.slice(i, i + cols));
  }

  return (
    <View
      style={[styles.container, { paddingHorizontal: fullWidth ? 0 : spacing }]}
    >
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            styles.actionGrid,
            { marginTop: rowIndex > 0 ? spacing / 2 : 0, gap: spacing / 2 },
          ]}
        >
          {row.map((action) => (
            <View key={action.title} style={{ flex: 1 }}>
              <GarzonActionCard
                title={action.title}
                description={action.description}
                icon={action.icon}
                color={action.color}
                onPress={() => router.push(action.route as Href)}
              />
            </View>
          ))}
          {row.length < cols &&
            Array.from({ length: cols - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ flex: 1 }} />
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  actionGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.sm,
  },
});
