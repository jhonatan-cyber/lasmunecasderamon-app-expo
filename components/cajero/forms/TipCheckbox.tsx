import { useAccentColor } from "@/hooks/useAccentColor";
import { useConfigValue } from "@/hooks/useConfigValue";
import { haptic } from "@/utils/haptics";
import { BorderRadius } from "@/constants/spacing";
import { FontFamily } from "@/constants/fonts";
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
  const resolvedLabel = label || `Propina sugerida (${propinaPct}%)`;

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: enabled ? `${accentColor}12` : "transparent",
          borderColor: enabled ? `${accentColor}40` : "rgba(155,155,155,0.15)",
        },
      ]}
      onPress={() => {
        haptic.select();
        onToggle(!enabled);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: enabled }}
    >
      <View style={styles.leftContent}>
        <Ionicons
          name={enabled ? "checkbox" : "square-outline"}
          size={22}
          color={enabled ? accentColor : textSecondary}
          style={{ marginRight: 10 }}
        />
        <Text style={[styles.label, { color: enabled ? textPrimary : textSecondary, fontFamily: FontFamily.medium }]}>
          {resolvedLabel}
        </Text>
      </View>
      <Text style={[styles.val, { color: enabled ? accentColor : textSecondary, fontFamily: FontFamily.bold }]}>
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 6,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
  },
  val: {
    fontSize: 15,
  },
});
