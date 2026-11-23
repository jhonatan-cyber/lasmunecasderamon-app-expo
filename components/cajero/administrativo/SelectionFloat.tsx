import React from "react";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAccentColor } from '@/hooks/useAccentColor';

type SelectionFloatProps = {
  selectedDatesCount: number;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  accentColor: string;
  onClear: () => void;
  onViewDetails: () => void;
};

export function SelectionFloat({
  selectedDatesCount,
  cardBg,
  borderColor,
  textPrimary,
  accentColor,
  onClear,
  onViewDetails,
}: SelectionFloatProps) {
  const { accentColor: dangerColor, accentText } = useAccentColor();
  if (selectedDatesCount === 0) return null;

  return (
    <View
      style={[
        styles.selectionFloat,
        { backgroundColor: cardBg, borderWidth: 1, borderColor },
      ]}
    >
      <Text style={[styles.selectionText, { color: textPrimary }]}>
        {selectedDatesCount} {selectedDatesCount === 1 ? "día" : "días"}{" "}
        seleccionados
      </Text>
      <View style={styles.selectionActions}>
        <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Borrar selección de días" style={styles.clearBtn}>
          <Text style={[styles.clearBtnText, { color: dangerColor }]}>Borrar</Text>
        </Pressable>
        <Pressable
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel="Ver detalles de días seleccionados"
          style={[styles.viewBtn, { backgroundColor: accentColor }]}
        >
          <Text style={[styles.viewBtnText, { color: accentText }]}>Detalles</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectionFloat: {
    padding: 16,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  selectionText: { fontFamily: FontFamily.bold },
  selectionActions: { flexDirection: "row", gap: 10 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  clearBtnText: { fontFamily: FontFamily.extrabold },
  viewBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: BorderRadius.full },
  viewBtnText: { fontFamily: FontFamily.extrabold },
});
