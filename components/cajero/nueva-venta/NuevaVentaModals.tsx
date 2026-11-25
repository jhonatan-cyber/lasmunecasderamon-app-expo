import Ionicons from "@expo/vector-icons/Ionicons";
import { useAccentColor } from '@/hooks/useAccentColor';
import { FontFamily } from '@/constants/fonts';
import { useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import VirtualizedList from "@/components/shared/VirtualizedList";
import type { PaymentMethod } from "@/components/cajero/forms/PaymentMethodSelect";
import { CategoryProductModal } from "@/components/cajero/nueva-venta/CategoryProductModal";
import { LoadBalanceModal } from "@/components/cajero/nueva-venta/LoadBalanceModal";
import type { SaleChoice } from "@/hooks/utils/saleChoice";

type Props = {
  styles: Record<string, any>;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  categoryModalVisible: boolean;
  modalCategoria: any;
  modalProducts: any[];
  modalLoading: boolean;
  selectedTime: number;
  timeModalVisible: boolean;
  loadModalVisible: boolean;
  loadingTargetClient: any | null;
  loadingAmount: string;
  loadMetodoPago: PaymentMethod;
  loadSubmitting: boolean;
  cart: any[];
  cartItemCount: number;
  onCloseCategoryModal: () => void;
  onPressAddProduct: (item: any, choice: SaleChoice, quantity: number) => void;
  onRemoveFromCart: (item: any, choice: SaleChoice) => void;
  onCloseTimeModal: () => void;
  onSelectTime: (time: number) => void;
  onCloseLoadModal: () => void;
  onLoadAmountChange: (value: string) => void;
  onLoadMetodoPagoChange: (value: PaymentMethod) => void;
  onConfirmLoad: () => void;
};

const timeOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export function NuevaVentaModals({
  styles,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  categoryModalVisible,
  modalCategoria,
  modalProducts,
  modalLoading,
  selectedTime,
  timeModalVisible,
  loadModalVisible,
  loadingTargetClient,
  loadingAmount,
  loadMetodoPago,
  loadSubmitting,
  cart,
  cartItemCount,
  onCloseCategoryModal,
  onPressAddProduct,
  onRemoveFromCart,
  onCloseTimeModal,
  onSelectTime,
  onCloseLoadModal,
  onLoadAmountChange,
  onLoadMetodoPagoChange,
  onConfirmLoad,
}: Props) {
  const handleAdd = useCallback(
    (item: any, choice: SaleChoice, quantity: number) =>
      onPressAddProduct(item, choice, quantity),
    [onPressAddProduct],
  );
  const handleRemove = useCallback(
    (item: any, choice: SaleChoice) =>
      onRemoveFromCart(item, choice),
    [onRemoveFromCart],
  );

  const { accentOnSurface } = useAccentColor();
  return (
    <>
      <CategoryProductModal
        visible={categoryModalVisible}
        categoria={modalCategoria}
        products={modalProducts}
        loading={modalLoading}
        cart={cart}
        cartItemCount={cartItemCount}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        styles={styles}
        onClose={onCloseCategoryModal}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      <Modal
        visible={timeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={onCloseTimeModal}
      >
        <View style={modalStyles.overlay}>
          <View
            style={[
              modalStyles.content,
              { backgroundColor: cardBg, padding: 0 },
            ]}
          >
            <View
              style={[
                modalStyles.header,
                { padding: 24, paddingBottom: 10, marginBottom: 0 },
              ]}
            >
              <Text style={[modalStyles.title, { color: textPrimary }]}>
                Tiempo de Estancia
              </Text>
              <Pressable onPress={onCloseTimeModal} accessibilityRole="button" accessibilityLabel="Cerrar selección de tiempo">
                <Ionicons name="close" size={26} color={textPrimary} />
              </Pressable>
            </View>
            <VirtualizedList
              data={timeOptions}
              keyExtractor={(item: number) => item.toString()}
              estimatedItemSize={60}
              contentContainerStyle={{ paddingHorizontal: 24 }}
              renderItem={({ item }: { item: number }) => (
                <Pressable
                  style={({ pressed }) => [
                    modalStyles.timeItem,
                    { borderBottomColor: borderColor, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => {
                    onSelectTime(item);
                    onCloseTimeModal();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item} minutos`}
                  accessibilityState={{ selected: selectedTime === item }}
                >
                  <Ionicons name="time" size={22} color={accentOnSurface} />
                  <Text
                    style={[
                      modalStyles.timeText,
                      { color: textPrimary, marginLeft: 16 },
                    ]}
                  >
                    {item} minutos
                  </Text>
                  {selectedTime === item && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={accentColor}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <LoadBalanceModal
        visible={loadModalVisible}
        clientName={loadingTargetClient?.nombre || loadingTargetClient?.name || ''}
        amount={loadingAmount}
        metodoPago={loadMetodoPago}
        submitting={loadSubmitting}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        styles={styles}
        onClose={onCloseLoadModal}
        onAmountChange={onLoadAmountChange}
        onMetodoPagoChange={onLoadMetodoPagoChange}
        onConfirm={onConfirmLoad}
      />
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  content: {
    borderRadius: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.extrabold,
  },
  timeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  timeText: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
});
