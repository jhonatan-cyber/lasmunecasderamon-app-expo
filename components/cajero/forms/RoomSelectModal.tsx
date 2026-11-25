import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from 'react-native';
import { useAccentColor } from "@/hooks/useAccentColor";
import { useRenderCount } from "@/hooks/useRenderCount";
import {
  SelectListModal,
  type SelectListItem,
} from "@/components/ui/SelectListModal";

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

const estadoHabitacion = (room: Room) =>
  Number(room.estado ?? room.status ?? 0);
const etiquetaEstado = (estado: number) => {
  if (estado === 0) return "INACTIVA";
  if (estado === 1) return "LIBRE";
  if (estado === 2) return "OCUPADA";
  return "NO DISPONIBLE";
};

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
    accentOnSurface,
    accentColor,
  } = useAccentColor();

  const items: SelectListItem[] = useMemo(() => {
    const available = requireCompleteConfig
      ? rooms.filter(
          (room) =>
            Number(room.precio ?? 0) > 0 && Number(room.tiempo ?? 0) > 0,
        )
      : rooms;

    return available.map((item) => {
      const itemId = String(item.id_habitacion || item.id);
      const isSelected = String(selectedRoomId) === itemId;
      const estado = estadoHabitacion(item);
      const estaLibre = estado === 1;
      const roomName =
        item.nombre || `Habitación ${item.id_habitacion || item.id}`;

      return {
        id: itemId,
        selected: isSelected,
        disabled: !estaLibre,
        accessibilityLabel: `${roomName}, ${etiquetaEstado(estado)}`,
        onPress: () => {
          if (estaLibre) onSelect(item);
        },
        renderContent: (selected, _accent, textColor, mutedColor) => (
          <View style={styles.row}>
            <View
              style={[
                styles.roomIcon,
                {
                  backgroundColor: estaLibre
                    ? `${accentOnSurface}20`
                    : `${accentColor}20`,
                },
              ]}
            >
              <Ionicons
                name="business"
                size={24}
                color={estaLibre ? accentOnSurface : accentColor}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.modalItemText, { color: textColor }]}>
                {roomName}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 13, color: mutedColor }}>
                  ${Number(item.precio || 0).toLocaleString()} • {item.tiempo || 0} min
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: estaLibre ? accentOnSurface : accentColor,
                    marginLeft: 8,
                    fontFamily: FontFamily.bold,
                  }}
                >
                  {`● ${etiquetaEstado(estado)}`}
                </Text>
              </View>
            </View>
            {selected && <Ionicons name="checkmark" size={18} color={primaryColor} />}
          </View>
        ),
      };
    });
  }, [accentColor, accentOnSurface, onSelect, primaryColor, requireCompleteConfig, rooms, selectedRoomId]);

  return (
    <SelectListModal
      visible={visible}
      onClose={onClose}
      title="Seleccionar Habitación"
      items={items}
      emptyText="No hay habitaciones disponibles"
    />
  );
});
RoomSelectModal.displayName = "RoomSelectModal";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: FontFamily.extrabold,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
