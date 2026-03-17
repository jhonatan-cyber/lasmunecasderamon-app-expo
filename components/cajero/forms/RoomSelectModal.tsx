import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAccentColor } from "../../../hooks/useAccentColor";

interface Room {
  id: string;
  id_habitacion?: string;
  nombre: string;
  precio: number;
  tiempo: number;
  estado: number;
}

interface RoomSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (room: Room) => void;
  rooms: Room[];
  selectedRoomId?: string;
}

export const RoomSelectModal: React.FC<RoomSelectModalProps> = ({
  visible,
  onClose,
  onSelect,
  rooms,
  selectedRoomId,
}) => {
  const { accentColor, isDark, cardBg, borderColor } = useAccentColor();
  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const primaryColor = accentColor;

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
            keyExtractor={(item) => (item.id_habitacion || item.id).toString()}
            renderItem={({ item }) => {
              const itemId = String(item.id_habitacion || item.id);
              const isSelected = String(selectedRoomId) === itemId;
              return (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    {
                      borderColor: isSelected ? primaryColor : borderColor,
                      backgroundColor: isSelected ? `${primaryColor}15` : 'transparent',
                      opacity: item.estado === 1 ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => { if (item.estado === 1) onSelect(item); }}
                >
                  <View style={[styles.roomIcon, { backgroundColor: item.estado === 1 ? "#10B98120" : "#EF444420" }]}>
                    <Ionicons name="business" size={24} color={item.estado === 1 ? "#10B981" : "#EF4444"} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.listItemTitle, { color: textPrimary }]}>
                      {item.nombre}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ fontSize: 13, color: textSecondary }}>
                        ${(item.precio || 0).toLocaleString()} • {item.tiempo || 0} min
                      </Text>
                      <Text style={{ fontSize: 11, color: item.estado === 1 ? "#10B981" : "#EF4444", marginLeft: 8, fontWeight: "bold" }}>
                        {item.estado === 1 ? "● DISPONIBLE" : "● OCUPADA"}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? primaryColor : borderColor,
                      backgroundColor: isSelected ? primaryColor : 'transparent',
                    },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <Pressable
            style={[styles.modalActionBtn, { backgroundColor: primaryColor }]}
            onPress={onClose}
          >
            <Text style={styles.modalActionBtnText}>Confirmar Selección</Text>
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: "80%",
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
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 10,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  modalActionBtn: {
    height: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  modalActionBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
