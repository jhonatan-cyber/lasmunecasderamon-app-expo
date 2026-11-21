import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from '@/constants/spacing';
import React from "react";
import { Pressable, StyleSheet, Text, View } from 'react-native';
import VirtualizedList from "@/components/shared/VirtualizedList";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useRenderCount } from "@/hooks/useRenderCount";
import { ModalBottomSheet } from "@/components/ui/ModalBottomSheet";

export interface Room {
  id: string | number;
  id_habitacion?: string | number;
  nombre: string;
  precio: number;
  tiempo: number;
  estado?: number;
  status?: number;
  comision_anfitriona?: number;
}

interface RoomSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (room: Room) => void;
  rooms: Room[];
  selectedRoomId?: string | number;
  requireCompleteConfig?: boolean;
}

export const RoomSelectModal = React.memo(function RoomSelectModal({
  visible,
  onClose,
  onSelect,
  rooms,
  selectedRoomId,
  requireCompleteConfig = false,
}: RoomSelectModalProps) {
  useRenderCount("RoomSelectModal", { visible, roomCount: rooms.length });
  const {
    accentColor: primaryColor,
    borderColor,
    textPrimary,
    textSecondary,
  } = useAccentColor();

  const estadoHabitacion = (room: Room) =>
    Number(room.estado ?? room.status ?? 0);
  const etiquetaEstado = (estado: number) => {
    if (estado === 0) return "INACTIVA";
    if (estado === 1) return "LIBRE";
    if (estado === 2) return "OCUPADA";
    return "NO DISPONIBLE";
  };

  return (
    <ModalBottomSheet
      visible={visible}
      onClose={onClose}
      title="Seleccionar Habitación"
      actionLabel="Listo"
      onAction={onClose}
      scrollable={false}
    >
      <View style={{ flex: 1 }}>
        <VirtualizedList
          data={
            requireCompleteConfig
              ? rooms.filter(
                  (room) =>
                    Number(room.precio ?? 0) > 0 &&
                    Number(room.tiempo ?? 0) > 0,
                )
              : rooms
          }
          keyExtractor={(item: Room) =>
            (item.id_habitacion || item.id).toString()
          }
          estimatedItemSize={80}
          renderItem={({ item }: { item: Room }) => {
            const itemId = String(item.id_habitacion || item.id);
            const isSelected = String(selectedRoomId) === itemId;
            const estado = estadoHabitacion(item);
            const estaLibre = estado === 1;
            const roomName =
              item.nombre || `Habitación ${item.id_habitacion || item.id}`;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${roomName}, ${etiquetaEstado(estado)}`}
                accessibilityState={{
                  disabled: !estaLibre,
                  selected: isSelected,
                }}
                disabled={!estaLibre}
                onPress={() => {
                  if (estaLibre) onSelect(item);
                }}
                style={[
                  styles.modalItem,
                  {
                    borderColor: isSelected ? primaryColor : borderColor,
                    backgroundColor: isSelected
                      ? `${primaryColor}15`
                      : "transparent",
                    opacity: estaLibre ? 1 : 0.6,
                    borderWidth: isSelected ? 2 : 1.5,
                  },
                ]}
              >
                <View
                  style={[
                    styles.roomIcon,
                    {
                      backgroundColor: estaLibre ? "#10B98120" : "#EF444420",
                    },
                  ]}
                >
                  <Ionicons
                    name="business"
                    size={24}
                    color={estaLibre ? "#10B981" : "#EF4444"}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[styles.modalItemText, { color: textPrimary }]}
                  >
                    {roomName}
                  </Text>
                  <View
                    style={{ flexDirection: "row", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, color: textSecondary }}>
                      ${Number(item.precio || 0).toLocaleString()} •{" "}
                      {item.tiempo || 0} min
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: estaLibre ? "#10B981" : "#EF4444",
                        marginLeft: 8,
                        fontWeight: "bold",
                      }}
                    >
                      {`● ${etiquetaEstado(estado)}`}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color={primaryColor} />
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </ModalBottomSheet>
  );
});
RoomSelectModal.displayName = "RoomSelectModal";

const styles = StyleSheet.create({
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    marginBottom: 10,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "800",
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
