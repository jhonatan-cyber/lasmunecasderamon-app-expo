import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        <Pressable onPress={onClear} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Borrar</Text>
        </Pressable>
        <Pressable
          onPress={onViewDetails}
          style={[styles.viewBtn, { backgroundColor: accentColor }]}
        >
          <Text style={styles.viewBtnText}>Detalles</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectionFloat: {
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
  },
  selectionText: { fontWeight: "700" },
  selectionActions: { flexDirection: "row", gap: 10 },
  clearBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  clearBtnText: { color: "#EF4444", fontWeight: "800" },
  viewBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  viewBtnText: { color: "#FFF", fontWeight: "800" },
});
