import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

interface Room {
  id: number | string;
  id_habitacion?: number | string;
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
  selectedRoomId?: number | string;
}

export const RoomSelectModal: React.FC<RoomSelectModalProps> = ({
  visible,
  onClose,
  onSelect,
  rooms,
  selectedRoomId,
}) => {
  const isDark = useColorScheme() === "dark";
  const cardBg = isDark ? "#1F2937" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? "#374151" : "#E5E7EB";

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
              const itemId = item.id_habitacion || item.id;
              const isSelected = selectedRoomId === itemId;
              return (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    {
                      borderBottomColor: borderColor,
                      opacity: item.estado === 1 ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => {
                    if (item.estado === 1) {
                      onSelect(item);
                    } else {
                      // Optional: show a toast or alert
                    }
                  }}
                >
                  <View
                    style={[
                      styles.roomIcon,
                      {
                        backgroundColor:
                          item.estado === 1 ? "#10B98120" : "#EF444420",
                      },
                    ]}
                  >
                    <Ionicons
                      name="business"
                      size={24}
                      color={item.estado === 1 ? "#10B981" : "#EF4444"}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[styles.listItemTitle, { color: textPrimary }]}
                    >
                      {item.nombre}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 13, color: textSecondary }}>
                        ${(item.precio || 0).toLocaleString()} •{" "}
                        {item.tiempo || 0} min
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: item.estado === 1 ? "#10B981" : "#EF4444",
                          marginLeft: 8,
                          fontWeight: "bold",
                        }}
                      >
                        {item.estado === 1 ? "● DISPONIBLE" : "● OCUPADA"}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#E11D48"
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  listItemTitle: {
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
