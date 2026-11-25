import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import React, { useMemo } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";
import { BASE_URL } from "@/api/client";
import {
  SelectListModal,
  type SelectListItem,
} from "@/components/ui/SelectListModal";

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
    accentBg,
    accentOnSurface,
  } = useAccentColor();

  const items: SelectListItem[] = useMemo(
    () =>
      hostesses.map((item) => {
        const rawId = item.id;
        const isSelected = selectedIds.some(
          (sid) => String(sid) === String(rawId),
        );
        const isMaxReached = max !== undefined && selectedIds.length >= max;
        // Un 1 explícito marca la anfitriona como ocupada; las que están en
        // allowedOccupiedIds pertenecen al servicio que se está editando.
        const isAllowedOccupied = allowedOccupiedIds.some(
          (id) => String(id) === String(rawId),
        );
        const isOccupied =
          Number(item.estado_servicio) === 1 && !isAllowedOccupied;
        const isDisabled = (isMaxReached && !isSelected) || isOccupied;
        const roomInfo =
          (item as any).habitacion_nombre ||
          (item as any).habitacion ||
          (item as any).room ||
          "";
        const displayName =
          item.nick || item.nombre || item.name || "Anfitriona";

        return {
          id: rawId,
          selected: isSelected,
          disabled: isDisabled,
          accessibilityLabel: `${displayName}${isOccupied ? ", ocupada en servicio" : ""}`,
          onPress: () => {
            if (!isDisabled) onToggle(rawId);
          },
          renderContent: (selected) => (
            <View style={styles.row}>
              <View
                style={[
                  styles.avatarMini,
                  {
                    backgroundColor: isOccupied
                      ? accentBg
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
                  <View style={styles.avatarFallback}>
                    <Text
                      style={[styles.avatarText, { color: accentOnSurface }]}
                    >
                      {(item.nick?.[0] || item.nombre?.[0] || "A").toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modalItemText,
                    { color: isOccupied ? accentOnSurface : textPrimary },
                  ]}
                >
                  {displayName}
                </Text>
                {isOccupied ? (
                  <Text
                    style={{
                      color: accentOnSurface,
                      fontSize: 10,
                      fontFamily: FontFamily.extrabold,
                      marginTop: 2,
                    }}
                  >
                    OCUPADA EN SERVICIO {roomInfo ? `(${roomInfo})` : ""}
                  </Text>
                ) : (
                  <Text
                    style={{
                      color: accentOnSurface,
                      fontSize: 10,
                      fontFamily: FontFamily.extrabold,
                      marginTop: 2,
                    }}
                  >
                    LIBRE
                  </Text>
                )}
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              )}
              {isOccupied && (
                <Ionicons name="lock-closed" size={18} color={accentColor} />
              )}
            </View>
          ),
        };
      }),
    [
      accentBg,
      accentColor,
      accentOnSurface,
      allowedOccupiedIds,
      hostesses,
      max,
      onToggle,
      selectedIds,
      textPrimary,
    ],
  );

  return (
    <SelectListModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={max !== undefined ? `Máximo ${max} seleccionadas` : undefined}
      items={items}
      onConfirm={onConfirm}
      emptyText="No hay anfitrionas disponibles"
    />
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
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
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
  },
});
