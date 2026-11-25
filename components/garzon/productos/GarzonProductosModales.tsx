import React from "react";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import Ionicons from "@expo/vector-icons/Ionicons";
import { showToast } from "@/utils/toast-lazy";
import { ClientSelectModal } from "@/components/cajero/forms/ClientSelectModal";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import type { Anfitriona, CartItem, Room , Product } from "@/types/cart";
import { Client } from "@/hooks/useGarzonProductos";
import { useCartStore } from "@/store/cartStore";
import { getHostessLimit } from "@/hooks/utils/cuentaUtils";


interface GarzonProductosModalesProps {
  clientModalVisible: boolean;
  setClientModalVisible: (visible: boolean) => void;
  clients: Client[];
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;

  clearCartAlertVisible: boolean;
  setClearCartAlertVisible: (visible: boolean) => void;
  clearCart: () => void;

  activeConfigItem: { productId: string; type: "hostess" | "room" } | null;
  setActiveConfigItem: (
    item: { productId: string; type: "hostess" | "room" } | null,
  ) => void;
  cart: CartItem[];
  anfitrionas: Anfitriona[];
  rooms: Room[];
  products: Product[];
  getMaxHostesses: (item: CartItem) => number;
  updateItemHostesses: (
    productId: string,
    hostessIds: (string | number)[],
  ) => void;
  updateItemRoom: (productId: string, roomId: string | null) => void;

  insets: { bottom: number };
  accentColor: string;
  accentOnSurface: string;
  borderColor: string;
  cardBg: string;
  textPrimary: string;
}

export const GarzonProductosModales: React.FC<GarzonProductosModalesProps> = ({
  clientModalVisible,
  setClientModalVisible,
  clients,
  selectedClientId,
  setSelectedClientId,
  clearCartAlertVisible,
  setClearCartAlertVisible,
  clearCart,
  activeConfigItem,
  setActiveConfigItem,
  cart,
  anfitrionas,
  rooms,
  products,
  getMaxHostesses,
  updateItemHostesses,
  updateItemRoom,
  insets,
  accentColor,
  accentOnSurface,
  borderColor,
  cardBg,
  textPrimary,
}) => {
  // Suscribirse al carrito del store de forma reactiva para que el modal
  // se re-renderice cuando updateItemHostesses actualice las selecciones.
  const cartFromStore = useCartStore((state) => state.cart);
  const currentConfigItem = activeConfigItem
    ? cartFromStore.find((i) => i.product.id === activeConfigItem.productId)
    : null;
  // Si no hay item en el carrito, calcular el límite desde el producto directamente.
  const maxHostesses = currentConfigItem
    ? getMaxHostesses(currentConfigItem)
    : (() => {
        const product = activeConfigItem
          ? products.find((p) => p.id === activeConfigItem.productId)
          : null;
        if (!product) return 0;
        if (product.tipo_venta === "shot") return product.shot_anfitriona ? 1 : 0;
        return getHostessLimit(product, 1);
      })();

  return (
    <>
      {}
      <ClientSelectModal
        visible={clientModalVisible}
        onClose={() => setClientModalVisible(false)}
        clients={clients as any}
        selectedIds={selectedClientId ? [selectedClientId] : []}
        onToggle={(id) => {
          setSelectedClientId(
            selectedClientId === String(id) ? null : String(id),
          );
          setClientModalVisible(false);
        }}
      />

      {}
      <PremiumAlert
        visible={clearCartAlertVisible}
        title="Vaciar Carrito"
        message="¿Estás seguro que deseas eliminar todos los productos del pedido? Esta acción no se puede deshacer."
        type="danger"
        showCancel
        confirmText="Sí, vaciar"
        cancelText="Cancelar"
        onConfirm={() => {
          clearCart();
          setActiveConfigItem(null);
          setClearCartAlertVisible(false);
        }}
        onCancel={() => setClearCartAlertVisible(false)}
      />

      {}
      <Modal
        visible={!!activeConfigItem}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveConfigItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, paddingBottom: insets.bottom },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                {activeConfigItem?.type === "hostess"
                  ? `Asignar Anfitrionas (Máx ${maxHostesses})`
                  : "Seleccionar Habitación"}
              </Text>
              <Pressable onPress={() => setActiveConfigItem(null)} accessibilityRole="button" accessibilityLabel="Cerrar selección">
                <Ionicons name="close" size={24} color={textPrimary} />
              </Pressable>
            </View>

            {activeConfigItem?.type === "hostess" && (
              <Text style={{ color: textPrimary, paddingHorizontal: 20 }}>
                {currentConfigItem?.selectedHostesses.length || 0} de{" "}
                {maxHostesses} seleccionadas
              </Text>
            )}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {activeConfigItem?.type === "hostess" ? (
                anfitrionas.map((a) => {
                  const isSelected =
                    !!currentConfigItem?.selectedHostesses?.some(
                      (id) => String(id) === String(a.id),
                    );
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        const current =
                          currentConfigItem?.selectedHostesses || [];
                        if (isSelected) {
                          updateItemHostesses(
                            activeConfigItem.productId,
                            current.filter((id) => String(id) !== String(a.id)),
                          );
                        } else if (current.length < maxHostesses) {
                          updateItemHostesses(activeConfigItem.productId, [
                            ...current,
                            String(a.id),
                          ]);
                        } else {
                          showToast({
                            type: "error",
                            text1: "Límite",
                            text2: `Máximo ${maxHostesses} anfitriona(s) para este producto.`,
                          });
                        }
                      }}
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
                      accessibilityLabel={a.nick || a.name}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[styles.modalItemText, { color: textPrimary }]}
                      >
                        {a.nick || a.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={accentOnSurface}
                        />
                      )}
                    </Pressable>
                  );
                })
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      updateItemRoom(activeConfigItem!.productId, null);
                      setActiveConfigItem(null);
                    }}
                    style={[
                      styles.modalItem,
                      {
                        borderColor: !currentConfigItem?.selectedRoom
                          ? accentColor
                          : borderColor,
                        backgroundColor: !currentConfigItem?.selectedRoom
                          ? `${accentColor}15`
                          : "transparent",
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel="Sin habitación"
                    accessibilityState={{ selected: !currentConfigItem?.selectedRoom }}
                  >
                    <Text
                      style={[styles.modalItemText, { color: textPrimary }]}
                    >
                      Sin Habitación
                    </Text>
                  </Pressable>
                  {rooms.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => {
                        updateItemRoom(activeConfigItem!.productId, r.id);
                        setActiveConfigItem(null);
                      }}
                      style={[
                        styles.modalItem,
                        {
                          borderColor:
                            currentConfigItem?.selectedRoom === r.id
                              ? accentColor
                              : borderColor,
                          backgroundColor:
                            currentConfigItem?.selectedRoom === r.id
                              ? `${accentColor}15`
                              : "transparent",
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityLabel={r.name}
                      accessibilityState={{ selected: currentConfigItem?.selectedRoom === r.id }}
                    >
                      <Text
                        style={[styles.modalItemText, { color: textPrimary }]}
                      >
                        {r.name}
                      </Text>
                      {currentConfigItem?.selectedRoom === r.id && (
                        <Ionicons
                          name="checkmark"
                          size={16}
                          color={accentOnSurface}
                        />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setActiveConfigItem(null)}
              style={[styles.doneBtn, { backgroundColor: accentColor }]}
              accessibilityRole="button"
              accessibilityLabel="Confirmar selección"
            >
              <Text style={styles.doneBtnText}>Listo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  modalTitle: { fontSize: 18, fontFamily: FontFamily.extrabold },
  modalList: { padding: 16 },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
    borderWidth: 2,
  },
  modalItemText: { fontSize: 16, fontFamily: FontFamily.semibold },
  doneBtn: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  doneBtnText: { color: "#FFF", fontSize: 16, fontFamily: FontFamily.bold },
});
