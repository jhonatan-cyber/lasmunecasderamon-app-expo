import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import FlashList from "@/components/shared/FlashList";

import { PaymentMethod, PaymentMethodSelect } from "@/components/cajero/forms/PaymentMethodSelect";
import { resolverVentaProducto, type SaleChoice } from "@/hooks/utils/saleChoice";
import { SaleFormatSelector } from "@/components/cajero/nueva-venta/SaleFormatSelector";
import { useConfigValue } from "@/hooks/useConfigValue";

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
  onCloseCategoryModal: () => void;
  onPressAddProduct: (item: any, choice: SaleChoice, quantity: number) => void;
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
  onCloseCategoryModal,
  onPressAddProduct,
  onCloseTimeModal,
  onSelectTime,
  onCloseLoadModal,
  onLoadAmountChange,
  onLoadMetodoPagoChange,
  onConfirmLoad,
}: Props) {
  const shotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  return (
    <>
      <Modal visible={categoryModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>{modalCategoria?.name || "Productos"}</Text>
              <Pressable onPress={onCloseCategoryModal} accessibilityLabel="Cerrar modal" accessibilityRole="button">
                <Ionicons name="close" size={26} color={textPrimary} />
              </Pressable>
            </View>
            {modalLoading ? (
              <ActivityIndicator size="large" color={accentColor} style={{ margin: 40 }} />
            ) : (
              <FlashList
                data={modalProducts}
                keyExtractor={(item: any) => (item.id || item.id_producto).toString()}
                estimatedItemSize={80}
                renderItem={({ item }: { item: any }) => {
                  const venta = resolverVentaProducto(item);
                  return (
                    <View style={[styles.productItem, { borderBottomColor: borderColor }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.productName, { color: textPrimary }]}>{item.name || item.nombre}</Text>
                        <SaleFormatSelector
                          product={item}
                          options={venta.opciones}
                          shotMl={shotMl}
                          accentColor={accentColor}
                          textPrimary={textPrimary}
                          textSecondary={textSecondary}
                          borderColor={borderColor}
                          cardBg={cardBg}
                          onAdd={(choice, quantity) => onPressAddProduct(item, choice, quantity)}
                        />
                      </View>
                    </View>
                  );
                }}
              />
            )}
            <Pressable
              style={[styles.confirmModalBtn, { backgroundColor: accentColor }]}
              onPress={onCloseCategoryModal}
              accessibilityLabel="Confirmar selección de productos"
              accessibilityRole="button"
            >
              <Text style={styles.confirmModalBtnText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={timeModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg, padding: 0 }]}>
            <View style={[styles.modalHeader, { padding: 24, paddingBottom: 10, marginBottom: 0 }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Tiempo de Estancia</Text>
              <Pressable onPress={onCloseTimeModal}>
                <Ionicons name="close" size={26} color={textPrimary} />
              </Pressable>
            </View>
            <FlashList
              data={timeOptions}
              keyExtractor={(item: number) => item.toString()}
              estimatedItemSize={60}
              contentContainerStyle={{ paddingHorizontal: 24 }}
              renderItem={({ item }: { item: number }) => (
                <TouchableOpacity
                  style={[styles.productItem, { borderBottomColor: borderColor }]}
                  onPress={() => {
                    onSelectTime(item);
                    onCloseTimeModal();
                  }}
                >
                  <Ionicons name="time" size={22} color="#10B981" />
                  <Text style={[styles.productName, { color: textPrimary, marginLeft: 16 }]}>{item} minutos</Text>
                  {selectedTime === item && <Ionicons name="checkmark-circle" size={24} color={accentColor} style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={loadModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg, height: "auto", paddingBottom: 40 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Cargar Saldo</Text>
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>
                  {loadingTargetClient?.nombre || loadingTargetClient?.name}
                </Text>
              </View>
              <Pressable onPress={onCloseLoadModal}>
                <Ionicons name="close" size={24} color={textPrimary} />
              </Pressable>
            </View>

            <View style={{ gap: 15 }}>
              <View>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "800", marginBottom: 8 }}>MONTO A CARGAR</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 12,
                    padding: 15,
                    color: textPrimary,
                    fontSize: 18,
                    fontWeight: "700",
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                  }}
                  placeholder="0"
                  placeholderTextColor={textSecondary}
                  keyboardType="numeric"
                  value={loadingAmount}
                  onChangeText={onLoadAmountChange}
                  autoFocus
                />
              </View>

              <PaymentMethodSelect
                selectedMethod={loadMetodoPago}
                onSelect={onLoadMetodoPagoChange}
                showPrepago={false}
              />

              <TouchableOpacity
                style={{
                  backgroundColor: accentColor,
                  height: 56,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 10,
                  opacity: loadSubmitting ? 0.7 : 1,
                }}
                onPress={onConfirmLoad}
                disabled={loadSubmitting}
              >
                {loadSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "900" }}>CONFIRMAR CARGA</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
