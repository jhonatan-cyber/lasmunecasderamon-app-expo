import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from '@/constants/spacing';
import React from "react";
import { Image } from "expo-image";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";
import { BASE_URL } from "@/api/client";
import { ModalBottomSheet } from "@/components/ui/ModalBottomSheet";

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
  allowedOccupiedIds?: string[];
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
  allowedOccupiedIds = [],
  title = "Seleccionar Anfitrionas",
}) => {
  const {
    accentColor,
    textPrimary,
    borderColor: subtleBorder,
  } = useAccentColor();

  return (
    <ModalBottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={max !== undefined ? `Máximo ${max} seleccionadas` : undefined}
      actionLabel="Listo"
      onAction={onConfirm || onClose}
      scrollable={false}
    >
      <FlatList
        data={hostesses}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        windowSize={5}
        renderItem={({ item }) => {
        const rawId = item.id;
        const isSelected = selectedIds.some(
          (sid) => String(sid) === String(rawId),
        );
        const isMaxReached =
          max !== undefined && selectedIds.length >= max;
        const isOccupied = Number(item.estado_servicio) === 1;
        const isDisabled =
          (isMaxReached && !isSelected) || isOccupied;

        const roomInfo =
          (item as any).habitacion_nombre ||
          (item as any).habitacion ||
          (item as any).room ||
          "";

        return (
          <Pressable
            onPress={() =>
              !isDisabled && onToggle(rawId as number | string)
            }
            disabled={isDisabled}
            style={[
              styles.modalItem,
              {
                borderColor: isSelected
                  ? accentColor
                  : isOccupied
                    ? "#EF444450"
                    : subtleBorder,
                backgroundColor: isSelected
                  ? `${accentColor}15`
                  : isOccupied
                    ? "#EF444408"
                    : "transparent",
                opacity: isMaxReached && !isSelected ? 0.5 : 1,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                gap: 12,
              }}
            >
              <View
                style={[
                  styles.avatarMini,
                  {
                    backgroundColor: isOccupied
                      ? "#EF444420"
                      : `${accentColor}20`,
                  },
                ]}
              >
                {item.foto ? (
                  <Image
                    source={{ uri: `${BASE_URL}/img/users/${item.foto}` }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        { color: isOccupied ? "#EF4444" : accentColor },
                      ]}
                    >
                      {(
                        item.nick?.[0] ||
                        item.nombre?.[0] ||
                        "A"
                      ).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalItemText,
                    { color: isOccupied ? "#EF4444" : textPrimary },
                  ]}
                >
                  {item.nick || item.nombre || item.name || "Anfitriona"}
                </Text>
                {isOccupied ? (
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 10,
                      fontWeight: "800",
                      marginTop: 2,
                    }}
                  >
                    OCUPADA EN SERVICIO {roomInfo ? `(${roomInfo})` : ""}
                  </Text>
                ) : (
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 10,
                      fontWeight: "800",
                      marginTop: 2,
                    }}
                  >
                    LIBRE
                  </Text>
                )}
              </View>
            </View>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={accentColor}
              />
            )}
            {isOccupied && (
              <Ionicons name="lock-closed" size={18} color="#EF4444" />
            )}
          </Pressable>
        );
        }}
      />
    </ModalBottomSheet>
  );
};

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
    fontWeight: "700",
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
