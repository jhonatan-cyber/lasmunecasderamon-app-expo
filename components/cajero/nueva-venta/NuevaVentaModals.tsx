import { matchesProductSearch } from "../../../hooks/utils/productSearch";
import { BASE_URL } from "@/api/base-url";
import { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FlashList from "@/components/shared/FlashList";

import {
  PaymentMethod,
  PaymentMethodSelect,
} from "@/components/cajero/forms/PaymentMethodSelect";
import {
  resolverVentaProducto,
  type SaleChoice,
} from "@/hooks/utils/saleChoice";
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

function ProductThumbnail({
  photo,
  name,
  accentColor,
}: {
  photo?: string;
  name: string;
  accentColor: string;
}) {
  const uri = photo
    ? photo.startsWith("http")
      ? photo
      : `${BASE_URL}/api/images/products/${encodeURIComponent(photo)}`
    : null;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return (
    <View
      style={[productStyles.thumbnail, { backgroundColor: `${accentColor}12` }]}
    >
      {uri && uri !== failedUri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
          accessibilityLabel={`Foto de ${name}`}
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <Ionicons name="cube-outline" size={28} color={accentColor} />
      )}
    </View>
  );
}

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
  const [productSearch, setProductSearch] = useState("");
  const insets = useSafeAreaInsets();
  const filteredProducts = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const query = normalize(productSearch.trim());
    return modalProducts.filter((item) => matchesProductSearch(item, query));
  }, [modalProducts, productSearch]);
  const shotMl = useConfigValue<number>("bar", "shot_ml", 50);
  return (
    <>
      <Modal
        visible={categoryModalVisible}
        onShow={() => setProductSearch("")}
        animationType="slide"
        transparent={true}
        onRequestClose={onCloseCategoryModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={productStyles.overlay}
        >
          <View
            style={[
              productStyles.sheet,
              {
                backgroundColor: cardBg,
                paddingBottom: Math.max(insets.bottom, 16),
                marginTop: insets.top + 12,
              },
            ]}
          >
            <View
              style={[productStyles.handle, { backgroundColor: borderColor }]}
            />
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[productStyles.eyebrow, { color: accentColor }]}>
                  NUEVA VENTA
                </Text>
                <Text style={[productStyles.title, { color: textPrimary }]}>
                  {modalCategoria?.name || "Productos"}
                </Text>
                <Text
                  style={[productStyles.subtitle, { color: textSecondary }]}
                >
                  Elige la presentación y agrega la cantidad que necesitas.
                </Text>
              </View>
              <Pressable
                style={[
                  productStyles.close,
                  { backgroundColor: `${textSecondary}15` },
                ]}
                onPress={onCloseCategoryModal}
                accessibilityLabel="Cerrar modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={26} color={textPrimary} />
              </Pressable>
            </View>
            <View
              style={[
                productStyles.search,
                {
                  borderColor,
                  backgroundColor: isDark ? "#ffffff08" : "#00000004",
                },
              ]}
            >
              <Ionicons name="search-outline" size={21} color={textSecondary} />
              <TextInput
                style={[productStyles.searchInput, { color: textPrimary }]}
                placeholder="Buscar producto en esta categoría"
                placeholderTextColor={textSecondary}
                value={productSearch}
                onChangeText={setProductSearch}
                autoCorrect={false}
                accessibilityLabel="Buscar producto"
              />
              {!!productSearch && (
                <Pressable
                  onPress={() => setProductSearch("")}
                  accessibilityLabel="Limpiar búsqueda"
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={textSecondary}
                  />
                </Pressable>
              )}
            </View>
            <Text style={[productStyles.count, { color: textSecondary }]}>
              {filteredProducts.length} productos disponibles
            </Text>
            {modalLoading ? (
              <ActivityIndicator
                size="large"
                color={accentColor}
                style={{ margin: 40 }}
              />
            ) : (
              <FlashList
                data={filteredProducts}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 12 }}
                ListEmptyComponent={
                  <View style={productStyles.empty}>
                    <Ionicons
                      name="search-outline"
                      size={38}
                      color={textSecondary}
                    />
                    <Text
                      style={[productStyles.emptyTitle, { color: textPrimary }]}
                    >
                      {productSearch ? "Sin coincidencias" : "No hay productos"}
                    </Text>
                    <Text style={{ color: textSecondary, textAlign: "center" }}>
                      {productSearch
                        ? "Prueba con otro nombre."
                        : "Esta categoría todavía no tiene productos disponibles."}
                    </Text>
                  </View>
                }
                keyExtractor={(item: any) =>
                  (item.id || item.id_producto).toString()
                }
                estimatedItemSize={80}
                renderItem={({ item }: { item: any }) => {
                  const venta = resolverVentaProducto(item);
                  return (
                    <View
                      style={[
                        productStyles.product,
                        {
                          borderColor,
                          backgroundColor: isDark ? "#ffffff05" : "#00000002",
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={productStyles.productHeader}>
                          <ProductThumbnail
                            photo={item.foto || item.producto_foto}
                            name={item.name || item.nombre || "Producto"}
                            accentColor={accentColor}
                          />
                          <Text
                            style={[
                              productStyles.productName,
                              { color: textPrimary, flex: 1 },
                            ]}
                          >
                            {item.name || item.nombre}
                          </Text>
                        </View>
                        <SaleFormatSelector
                          product={item}
                          options={venta.opciones}
                          shotMl={shotMl}
                          accentColor={accentColor}
                          textPrimary={textPrimary}
                          textSecondary={textSecondary}
                          borderColor={borderColor}
                          cardBg={cardBg}
                          onAdd={(choice, quantity) =>
                            onPressAddProduct(item, choice, quantity)
                          }
                        />
                      </View>
                    </View>
                  );
                }}
              />
            )}
            <Pressable
              style={[productStyles.done, { backgroundColor: accentColor }]}
              onPress={onCloseCategoryModal}
              accessibilityLabel="Volver a la venta"
              accessibilityRole="button"
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#FFFFFF"
              />
              <Text style={productStyles.doneText}>
                Listo, volver a la venta
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={timeModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, padding: 0 },
            ]}
          >
            <View
              style={[
                styles.modalHeader,
                { padding: 24, paddingBottom: 10, marginBottom: 0 },
              ]}
            >
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Tiempo de Estancia
              </Text>
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
                  style={[
                    styles.productItem,
                    { borderBottomColor: borderColor },
                  ]}
                  onPress={() => {
                    onSelectTime(item);
                    onCloseTimeModal();
                  }}
                >
                  <Ionicons name="time" size={22} color="#10B981" />
                  <Text
                    style={[
                      styles.productName,
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
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={loadModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: cardBg, height: "auto", paddingBottom: 40 },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>
                  Cargar Saldo
                </Text>
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
                <Text
                  style={{
                    color: textSecondary,
                    fontSize: 12,
                    fontWeight: "800",
                    marginBottom: 8,
                  }}
                >
                  MONTO A CARGAR
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 12,
                    padding: 15,
                    color: textPrimary,
                    fontSize: 18,
                    fontWeight: "700",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.02)",
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
                  <Text
                    style={{ color: "#FFF", fontSize: 16, fontWeight: "900" }}
                  >
                    CONFIRMAR CARGA
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const productStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    maxHeight: "92%",
    height: "88%",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginBottom: 5,
  },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 6, paddingRight: 8 },
  close: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 50,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 14, fontSize: 14 },
  count: { fontSize: 12, marginVertical: 12 },
  product: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: { fontSize: 17, fontWeight: "800", marginBottom: 10 },
  empty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  done: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 54,
    borderRadius: 18,
    marginTop: 12,
  },
  doneText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
