import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";
import { BASE_URL } from "@/api/client";

interface Hostess {
  id: number | string;
  id_usuario?: number | string;
  nick: string;
  nombre?: string;
  name?: string;
  foto?: string;
  status?: number;
  estado_servicio?: number;
}

interface HostessSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onToggle: (id: string | number) => void;
  hostesses: Hostess[];
  selectedIds: (string | number)[];
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
  const { accentColor, cardBg, textPrimary, textSecondary, borderColor: subtleBorder } = useAccentColor();

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

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {hostesses.map((item) => {
              const rawId = item.id_usuario || item.id || 0;
              const isSelected = selectedIds.some(sid => String(sid) === String(rawId));
              const isMaxReached = max !== undefined && selectedIds.length >= max;
              const isOccupied = Number(item.estado_servicio) === 1;
              const isDisabled = (isMaxReached && !isSelected) || isOccupied;

              const roomInfo = (item as any).habitacion_nombre || (item as any).habitacion || (item as any).room || "";
  
              return (
                <Pressable
                  key={rawId.toString()}
                  onPress={() => !isOccupied && onToggle(rawId as number | string)}
                  disabled={isDisabled}
                  style={[
                    styles.modalItem,
                    { 
                      borderColor: isSelected ? accentColor : isOccupied ? '#EF444450' : subtleBorder, 
                      backgroundColor: isSelected ? `${accentColor}15` : isOccupied ? '#EF444408' : 'transparent',
                      opacity: (isMaxReached && !isSelected) ? 0.5 : 1
                    }
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                    <View style={[styles.avatarMini, { backgroundColor: isOccupied ? '#EF444420' : `${accentColor}20` }]}>
                      {item.foto ? (
                        <Image source={{ uri: `${BASE_URL}/img/users/${item.foto}` }} style={styles.avatarImage} />
                      ) : (
                        <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={[styles.avatarText, { color: isOccupied ? '#EF4444' : accentColor }]}>
                            {(item.nick?.[0] || item.nombre?.[0] || 'A').toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalItemText, { color: isOccupied ? '#EF4444' : textPrimary }]}>
                        {item.nick || item.nombre || item.name || "Anfitriona"}
                      </Text>
                      {isOccupied && (
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800', marginTop: 2 }}>
                          OCUPADA EN SERVICIO {roomInfo ? `(${roomInfo})` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={accentColor} />}
                  {isOccupied && <Ionicons name="lock-closed" size={18} color="#EF4444" />}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={[styles.modalActionBtn, { backgroundColor: accentColor }]}
            onPress={onConfirm || onClose}
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
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
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
    fontWeight: "700",
  },
  modalActionBtn: {
    height: 56,
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
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});


