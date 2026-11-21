import { Pressable, StyleSheet, Text, View } from "react-native";
import { BorderRadius } from '@/constants/spacing';
import Ionicons from "@expo/vector-icons/Ionicons";
import { AnimatedView } from "@/components/ui/AnimatedView";

interface SelectedEventsBarProps {
  count: number;
  cardBg: string;
  accentColor: string;
  textPrimary: string;
  onOpenDetails: () => void;
}

export function SelectedEventsBar({
  count,
  cardBg,
  accentColor,
  textPrimary,
  onOpenDetails,
}: SelectedEventsBarProps) {
  const label =
    count === 1 ? "1 día seleccionado" : `${count} días seleccionados`;

  return (
    <AnimatedView
      from={{ translateY: 100 }}
      animate={{ translateY: 0 }}
      style={[styles.bar, { backgroundColor: cardBg }]}
    >
      <View style={styles.info}>
        <View style={[styles.iconBadge, { backgroundColor: `${accentColor}22` }]}>
          <Ionicons name="calendar" size={18} color={accentColor} />
        </View>
        <Text style={[styles.count, { color: textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Pressable
        onPress={onOpenDetails}
        accessibilityRole="button"
        accessibilityLabel="Ver detalles de los días seleccionados"
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.btnText}>DETALLES</Text>
      </Pressable>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 10,
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  info: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
  },
  btnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
