import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";

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
}

export const RoomSelectModal: React.FC<RoomSelectModalProps> = ({
  visible,
  onClose,
  onSelect,
  rooms,
  selectedRoomId,
}) => {
  const {
    accentColor: primaryColor,
    cardBg,
    borderColor,
    textPrimary,
    textSecondary,
  } = useAccentColor();

  
  const isLibre = (room: Room) => {
    const estado = Number(room.estado ?? room.status ?? 0);
    return estado === 1;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              Seleccionar Habitación
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          <FlatList
            data={rooms}
            extraData={selectedRoomId}
            keyExtractor={(item) => (item.id_habitacion || item.id).toString()}
            renderItem={({ item }) => {
              const itemId = String(item.id_habitacion || item.id);
              const isSelected = String(selectedRoomId) === itemId;
              const estaLibre = isLibre(item);
              const roomName = item.nombre || `Habitación ${item.id_habitacion || item.id}`;

              return (
                <Pressable
                  onPress={() => {
                    if (estaLibre) onSelect(item);
                  }}
                  style={[
                    styles.modalItem,
                    {
                      borderColor: isSelected ? primaryColor : borderColor,
                      backgroundColor: isSelected ? `${primaryColor}15` : "transparent",
                      opacity: estaLibre ? 1 : 0.6,
                      borderWidth: isSelected ? 2 : 1.5,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.roomIcon,
                      { backgroundColor: estaLibre ? "#10B98120" : "#EF444420" },
                    ]}
                  >
                    <Ionicons
                      name="business"
                      size={24}
                      color={estaLibre ? "#10B981" : "#EF4444"}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modalItemText, { color: textPrimary }]}>
                      {roomName}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 13, color: textSecondary }}>
                        ${(Number(item.precio || 0)).toLocaleString()} • {item.tiempo || 0} min
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: estaLibre ? "#10B981" : "#EF4444",
                          marginLeft: 8,
                          fontWeight: "bold",
                        }}
                      >
                        {estaLibre ? "● LIBRE" : "● OCUPADA"}
                      </Text>
                    </View>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color={primaryColor} />}
                </Pressable>
              );
            }}
          />

          <Pressable
            style={[styles.modalActionBtn, { backgroundColor: primaryColor }]}
            onPress={onClose}
          >
            <Text style={styles.modalActionBtnText}>Listo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    width: "100%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalActionBtn: {
    height: 54,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  modalActionBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
