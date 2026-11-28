import { BorderRadius } from "@/constants/spacing";
import { FontFamily } from "@/constants/fonts";
import { useAccentColor } from "@/hooks/useAccentColor";
import type { Anfitriona } from "@/types/cart";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface HostessAssignmentSelectorProps {
  hostesses: Anfitriona[];
  selectedIds: (string | number)[];
  max: number;
  onPress: () => void;
  emptyLabel: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  showSelectionCount?: boolean;
}

export function HostessAssignmentSelector({
  hostesses,
  selectedIds,
  max,
  onPress,
  emptyLabel,
  disabled = false,
  accessibilityLabel,
  showSelectionCount = true,
}: HostessAssignmentSelectorProps) {
  const { accentOnSurface, borderColor, textPrimary, textSecondary } =
    useAccentColor();
  const selectedHostesses = selectedIds.map((id) => ({
    id,
    name:
      hostesses.find((hostess) => String(hostess.id) === String(id))?.nick ||
      id,
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Abre el selector para agregar o quitar anfitrionas"
      style={{
        minHeight: 44,
        padding: 12,
        borderColor,
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {selectedHostesses.length > 0 ? (
        <View style={{ gap: 6 }}>
          {showSelectionCount && (
            <Text
              style={{
                color: textSecondary,
                fontSize: 12,
                fontFamily: FontFamily.medium,
              }}
            >
              {selectedHostesses.length} de {max} seleccionada(s)
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {selectedHostesses.map(({ id, name }) => (
              <View
                key={id}
                style={{
                  backgroundColor: `${accentOnSurface}18`,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    color: accentOnSurface,
                    fontFamily: FontFamily.medium,
                    fontSize: 13,
                  }}
                >
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={{ color: textPrimary, fontFamily: FontFamily.medium }}>
          {emptyLabel}
        </Text>
      )}
    </Pressable>
  );
}