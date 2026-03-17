import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAccentColor } from "../../../hooks/useAccentColor";

interface Hostess {
  id: number | string;
  id_usuario?: number | string;
  nick: string;
  foto?: string;
  status?: number;
  estado_servicio?: number;
}

interface HostessSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onToggle: (id: string) => void;
  hostesses: Hostess[];
  selectedIds: string[];
  max?: number;
  title?: string;
}

export const HostessSelectModal: React.FC<HostessSelectModalProps> = ({
  visible,
  onClose,
  onConfirm,
  onToggle,
  hostesses,
  selectedIds,
  max,
  title = "Seleccionar Anfitrionas",
}) => {
  const { accentColor, isDark, cardBg } = useAccentColor();
  const textPrimary = isDark ? "#FFFFFF" : "#000000";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const subtleBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {title}
              </Text>
              {max !== undefined && (
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                  Máximo {max} seleccionadas
                </Text>
              )}
            </View>
            <Pressable
              accessibilityLabel="Cerrar modal"
              accessibilityRole="button"
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>

          <FlatList
            data={hostesses}
            keyExtractor={(item) => (item.id_usuario || item.id).toString()}
            renderItem={({ item }) => {
              const id = String(item.id_usuario || item.id);
              const isSelected = selectedIds.includes(id);
              const isBusy = (item.estado_servicio || item.status) === 2;
              const isMaxReached = max !== undefined && selectedIds.length >= max;
              const isDisabled = isBusy || (isMaxReached && !isSelected);

              return (
                <TouchableOpacity
                  accessibilityLabel={`${item.nick}, ${isSelected ? "seleccionada" : "no seleccionada"}, ${isBusy ? "ocupada" : "disponible"}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected, disabled: isDisabled }}
                  style={[
                    styles.listItem,
                    {
                      borderColor: isSelected ? accentColor : subtleBorder,
                      backgroundColor: isSelected ? `${accentColor}18` : "transparent",
                      opacity: isDisabled ? 0.4 : 1,
                    },
                  ]}
                  onPress={() => { if (!isDisabled) onToggle(id); }}
                  disabled={isDisabled}
                >
                  <View style={[
                    styles.avatar,
                    { backgroundColor: isBusy ? "#EF4444" : accentColor },
                  ]}>
                    {item.foto ? (
                      <Image
                        source={{ uri: item.foto.startsWith("http") ? item.foto : `https://lasmunecasderamon.com/api/uploads/${item.foto}` }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {(item.nick || "A")[0].toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.listItemTitle, { color: textPrimary }]}>
                      {item.nick}
                    </Text>
                    <Text style={{ fontSize: 12, color: isBusy ? "#EF4444" : "#10B981", fontWeight: "bold" }}>
                      {isBusy ? "● OCUPADA" : "● DISPONIBLE"}
                    </Text>
                  </View>

                  <View style={[
                    styles.checkbox,
                    {
                      borderColor: isSelected ? accentColor : subtleBorder,
                      backgroundColor: isSelected ? accentColor : "transparent",
                    },
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <Pressable
            style={[styles.modalActionBtn, { backgroundColor: accentColor }]}
            onPress={onConfirm || onClose}
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
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 18,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
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
});
