import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TimeSelector } from "@/components/ui/TimeSelector";

type RoomSelectionSectionProps = {
  showRoomSelector: boolean;
  selectedHabitacion: any;
  selectedTime: number;
  spacing: number;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  onPressRoom: () => void;
  onChangeTime: (time: number) => void;
};

export function RoomSelectionSection({
  showRoomSelector,
  selectedHabitacion,
  selectedTime,
  spacing,
  cardBg,
  borderColor,
  accentColor,
  textPrimary,
  textSecondary,
  onPressRoom,
  onChangeTime,
}: RoomSelectionSectionProps) {
  if (!showRoomSelector) return null;

  return (
    <View style={{ marginBottom: spacing }}>
      <Pressable
        style={[
          styles.tiempoChip,
          {
            backgroundColor: selectedHabitacion ? `${accentColor}10` : cardBg,
            borderColor: selectedHabitacion ? accentColor : borderColor,
          },
        ]}
        onPress={onPressRoom}
      >
        <Ionicons
          name="business"
          size={18}
          color={selectedHabitacion ? accentColor : textSecondary}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.tiempoChipLabel, { color: textSecondary }]}>
            HABITACIÓN
          </Text>
          <Text
            style={[
              styles.tiempoChipValue,
              { color: selectedHabitacion ? accentColor : textPrimary },
            ]}
          >
            {selectedHabitacion?.nombre || "Seleccionar habitación"}
          </Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={16}
          color={selectedHabitacion ? accentColor : textSecondary}
        />
      </Pressable>
      {selectedHabitacion && (
        <View style={{ marginTop: 8 }}>
          <TimeSelector
            value={selectedTime}
            onChange={onChangeTime}
            step={5}
            min={5}
            max={60}
            label="Tiempo (minutos)"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tiempoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tiempoChipLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tiempoChipValue: { fontSize: 15, fontWeight: "700", marginTop: 2 },
});
