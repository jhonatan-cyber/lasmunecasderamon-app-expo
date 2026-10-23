import { useAccentColor } from "@/hooks/useAccentColor";
import { useConfigValue } from "@/hooks/useConfigValue";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TipCheckboxProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  tipAmount: number;
  label?: string;
}

export const TipCheckbox: React.FC<TipCheckboxProps> = ({
  enabled,
  onToggle,
  tipAmount,
  label,
}) => {
  const { accentColor, textPrimary, textSecondary } = useAccentColor();
  const propinaPct = Number(
    useConfigValue("facturacion", "propina_venta", "10"),
  );
  const resolvedLabel = label || `Propina (${propinaPct}%)`;

  return (
    <Pressable
      style={[styles.container]}
      onPress={() => onToggle(!enabled)}
      accessibilityRole="button"
      accessibilityState={{ selected: enabled }}
    >
      <View style={styles.leftContent}>
        <Ionicons
          name="cash-outline"
          size={20}
          color={enabled ? accentColor : textSecondary}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.label, { color: textSecondary }]}>
          {resolvedLabel}
        </Text>
      </View>
      <Text style={[styles.val, { color: textPrimary }]}>
        ${tipAmount.toLocaleString()}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  val: {
    fontSize: 15,
    fontWeight: "800",
  },
});
