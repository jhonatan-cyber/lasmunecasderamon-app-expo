import Ionicons from "@expo/vector-icons/Ionicons";
import { BorderRadius } from "@/constants/spacing";
import { FontFamily } from "@/constants/fonts";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useCartStore } from "@/store/cartStore";
import type { Anfitriona, Room } from "@/types/cart";
import { showToast } from "@/utils/toast-lazy";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface GarzonProductConfigModalProps {
  visible: boolean;
  productId: string;
  productIds?: string[];
  type: "hostess" | "room";
  hostesses: Anfitriona[];
  rooms: Room[];
  maxHostesses: number;
  bottomInset: number;
  onClose: () => void;
}

export const GarzonProductConfigModal: React.FC<GarzonProductConfigModalProps> = ({
  visible,
  productId,
  productIds,
  type,
  hostesses,
  rooms,
  maxHostesses,
  bottomInset,
  onClose,
}) => {
  const { accentColor, accentOnSurface, borderColor, cardBg, textPrimary } =
    useAccentColor();
  const configuredProductIds = productIds?.length ? productIds : [productId];
  const cart = useCartStore((state) => state.cart);
  const currentConfigItems = cart.filter((item) =>
    configuredProductIds.includes(item.product.id),
  );
  const currentConfigItem =
    currentConfigItems.find((item) => item.product.id === productId) ??
    currentConfigItems[0];
  const currentRoom =
    currentConfigItems.find((item) => item.selectedRoom)?.selectedRoom ?? null;

  const toggleHostess = (id: string) => {
    const current =
      useCartStore
        .getState()
        .cart.find((item) => item.product.id === productId)?.selectedHostesses ??
      [];
    const isSelected = current.some((selectedId) => String(selectedId) === id);

    if (isSelected) {
      void useCartStore
        .getState()
        .updateItemHostesses(
          productId,
          current.filter((selectedId) => String(selectedId) !== id),
        );
    } else if (current.length < maxHostesses) {
      void useCartStore
        .getState()
        .updateItemHostesses(productId, [...current, id]);
    } else {
      showToast({
        type: "error",
        text1: "Límite",
        text2: `Máximo ${maxHostesses} anfitriona(s) para este producto.`,
      });
    }
  };

  const selectRoom = (roomId: string | null) => {
    const state = useCartStore.getState();
    const selectedRoom =
      state.cart.find(
        (item) =>
          configuredProductIds.includes(item.product.id) && item.selectedRoom,
      )?.selectedRoom ?? null;
    const nextRoom = selectedRoom === roomId ? null : roomId;
    for (const id of configuredProductIds) {
      if (state.cart.some((item) => item.product.id === id)) {
        state.updateItemRoom(id, nextRoom);
      }
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View
        style={[
          styles.modalContent,
          { backgroundColor: cardBg, paddingBottom: Math.max(bottomInset, 20) },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>
            {type === "hostess"
              ? `Asignar Anfitrionas (Máx ${maxHostesses})`
              : "Seleccionar Habitación"}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeIconButton}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selección"
          >
            <Ionicons name="close" size={24} color={textPrimary} />
          </Pressable>
        </View>

        {type === "hostess" && (
          <Text style={{ color: textPrimary, paddingHorizontal: 20 }}>
            {currentConfigItem?.selectedHostesses.length || 0} de {maxHostesses} seleccionadas
          </Text>
        )}
        <ScrollView
          style={styles.modalList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {type === "hostess" ? (
            hostesses.map((hostess) => {
              const isSelected = !!currentConfigItem?.selectedHostesses?.some(
                (id) => String(id) === String(hostess.id),
              );
              return (
                <Pressable
                  key={hostess.id}
                  onPress={() => toggleHostess(String(hostess.id))}
                  style={[
                    styles.modalItem,
                    {
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: isSelected ? `${accentColor}15` : "transparent",
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={hostess.nick || hostess.name}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.modalItemText, { color: textPrimary }]}>
                    {hostess.nick || hostess.name}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={accentOnSurface} />
                  )}
                </Pressable>
              );
            })
          ) : (
            <>
              <Pressable
                onPress={() => selectRoom(null)}
                style={[
                  styles.modalItem,
                  {
                    borderColor: !currentRoom
                      ? accentColor
                      : borderColor,
                    backgroundColor: !currentRoom
                      ? `${accentColor}15`
                      : "transparent",
                  },
                ]}
                accessibilityRole="radio"
                accessibilityLabel="Sin habitación"
                accessibilityState={{ selected: !currentRoom }}
              >
                <Text style={[styles.modalItemText, { color: textPrimary }]}>
                  Sin Habitación
                </Text>
              </Pressable>
              {rooms.map((room) => {
                const isSelected = currentRoom === room.id;
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => selectRoom(room.id)}
                    style={[
                      styles.modalItem,
                      {
                        borderColor: isSelected ? accentColor : borderColor,
                        backgroundColor: isSelected
                          ? `${accentColor}15`
                          : "transparent",
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={room.name}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.modalItemText, { color: textPrimary }]}>
                      {room.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={accentOnSurface} />
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>

        <Pressable
          onPress={onClose}
          style={[styles.doneBtn, { backgroundColor: accentColor }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Text style={styles.doneBtnText}>Cerrar</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "#0008",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.card,
    padding: 20,
    maxHeight: "80%",
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeIconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 18, fontFamily: FontFamily.extrabold },
  modalList: { maxHeight: 360, flexShrink: 1 },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: BorderRadius.card,
    marginBottom: 8,
    borderWidth: 2,
  },
  modalItemText: { fontSize: 16, fontFamily: FontFamily.semibold },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  doneBtnText: { color: "#FFF", fontSize: 16, fontFamily: FontFamily.bold },
});