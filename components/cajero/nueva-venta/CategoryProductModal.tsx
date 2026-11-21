import { matchesProductSearch } from "../../../hooks/utils/productSearch";
import { BASE_URL } from "@/api/base-url";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
 StyleSheet } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import VirtualizedList from "@/components/shared/VirtualizedList";
import {
  resolverVentaProducto,
  type SaleChoice,
} from "@/hooks/utils/saleChoice";
import { SaleFormatSelector } from "@/components/cajero/nueva-venta/SaleFormatSelector";
import { useConfigValue } from "@/hooks/useConfigValue";
import { useAccentColor } from '@/hooks/useAccentColor';

interface CategoryProductModalProps {
  visible: boolean;
  categoria: any;
  products: any[];
  loading: boolean;
  cart: any[];
  cartItemCount: number;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  styles: Record<string, any>;
  onClose: () => void;
  onAdd: (item: any, choice: SaleChoice, quantity: number) => void;
  onRemove: (item: any, choice: SaleChoice) => void;
}

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
      style={[thumbnailStyles.thumbnail, { backgroundColor: `${accentColor}12` }]}
    >
      {uri && uri !== failedUri ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          accessibilityLabel={`Foto de ${name}`}
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <Ionicons name="cube-outline" size={28} color={accentColor} />
      )}
    </View>
  );
}

type ProductRowProps = {
  item: any;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  shotMl: number;
  cart: any[];
  onAdd: (item: any, choice: SaleChoice, quantity: number) => void;
  onRemove: (item: any, choice: SaleChoice) => void;
};

const ProductRow = memo(function ProductRow({
  item,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  shotMl,
  cart,
  onAdd,
  onRemove,
}: ProductRowProps) {
  const venta = resolverVentaProducto(item);
  const stockBar = Number(item.stock_bar ?? 0);
  return (
    <View
      style={[
        thumbnailStyles.product,
        {
          borderColor,
          backgroundColor: isDark ? "#ffffff05" : "#00000002",
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={thumbnailStyles.productHeader}>
          <ProductThumbnail
            photo={item.foto || item.producto_foto}
            name={item.name || item.nombre || "Producto"}
            accentColor={accentColor}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                thumbnailStyles.productName,
                { color: textPrimary, marginBottom: 0 },
              ]}
              numberOfLines={2}
            >
              {item.name || item.nombre}
            </Text>
            {item.stock_bar != null && (
              <Text style={[thumbnailStyles.stock, { color: textSecondary }]}>
                {`Stock en bar: ${stockBar} ${stockBar === 1 ? "unidad" : "unidades"}`}
              </Text>
            )}
          </View>
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
          cart={cart}
          onAdd={(choice, quantity) => onAdd(item, choice, quantity)}
          onRemove={(choice) => onRemove(item, choice)}
        />
      </View>
    </View>
  );
});

const productKey = (item: any) => (item.id || item.id_producto).toString();

export const CategoryProductModal: React.FC<CategoryProductModalProps> = ({
  visible,
  categoria,
  products,
  loading,
  cart,
  cartItemCount,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  styles,
  onClose,
  onAdd,
  onRemove,
}) => {
    const { accentOnSurface } = useAccentColor();
  const [search, setSearch] = useState("");
  const insets = useSafeAreaInsets();
  const shotMl = useConfigValue<number>("bar", "shot_ml", 50);

  const callbacksRef = useRef({ onAdd, onRemove });
  const handleAdd = useCallback(
    (item: any, choice: SaleChoice, quantity: number) =>
      callbacksRef.current.onAdd(item, choice, quantity),
    [],
  );
  const handleRemove = useCallback(
    (item: any, choice: SaleChoice) =>
      callbacksRef.current.onRemove(item, choice),
    [],
  );

  const filteredProducts = useMemo(() => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const query = normalize(search.trim());
    return products.filter((item) => matchesProductSearch(item, query));
  }, [products, search]);

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductRow
        item={item}
        accentColor={accentColor}
        cardBg={cardBg}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isDark={isDark}
        shotMl={shotMl}
        cart={cart}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    ),
    [
      accentColor,
      cardBg,
      borderColor,
      textPrimary,
      textSecondary,
      isDark,
      shotMl,
      cart,
      handleAdd,
      handleRemove,
    ],
  );

  return (
    <Modal
      avoidKeyboard={false}
      visible={visible}
      onShow={() => setSearch("")}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={thumbnailStyles.overlay}
      >
        <View
          style={[
            thumbnailStyles.sheet,
            {
              backgroundColor: cardBg,
              paddingBottom: Math.max(insets.bottom, 16),
              marginTop: insets.top + 12,
            },
          ]}
        >
          <View
            style={[thumbnailStyles.handle, { backgroundColor: borderColor }]}
          />
          <View
            style={[
              thumbnailStyles.search,
              {
                borderColor,
                backgroundColor: isDark ? "#ffffff08" : "#00000004",
              },
            ]}
          >
            <Ionicons name="search-outline" size={21} color={textSecondary} />
            <TextInput
              style={[thumbnailStyles.searchInput, { color: textPrimary }]}
              placeholder="Buscar producto en esta categoría"
              placeholderTextColor={textSecondary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              accessibilityLabel="Buscar producto"
            />
            {!!search && (
              <Pressable
                onPress={() => setSearch("")}
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
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[thumbnailStyles.eyebrow, { color: accentOnSurface }]}>
                NUEVA VENTA
              </Text>
              <Text style={[thumbnailStyles.title, { color: textPrimary }]}>
                {categoria?.name || "Productos"}
              </Text>
              <Text
                style={[thumbnailStyles.subtitle, { color: textSecondary }]}
              >
                Elige la presentación y agrega la cantidad que necesitas.
              </Text>
            </View>
          </View>
          <Text style={[thumbnailStyles.count, { color: textSecondary }]}>
            {filteredProducts.length} productos disponibles
          </Text>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={accentOnSurface}
              style={{ margin: 40 }}
            />
          ) : (
            <VirtualizedList
              data={filteredProducts}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
              ListEmptyComponent={
                <View style={thumbnailStyles.empty}>
                  <Ionicons
                    name="search-outline"
                    size={38}
                    color={textSecondary}
                  />
                  <Text
                    style={[thumbnailStyles.emptyTitle, { color: textPrimary }]}
                  >
                    {search ? "Sin coincidencias" : "No hay productos"}
                  </Text>
                  <Text style={{ color: textSecondary, textAlign: "center" }}>
                    {search
                      ? "Prueba con otro nombre."
                      : "Esta categoría todavía no tiene productos disponibles."}
                  </Text>
                </View>
              }
              keyExtractor={productKey}
              estimatedItemSize={80}
              renderItem={renderProductItem}
            />
          )}
          <Pressable
            style={[
              thumbnailStyles.done,
              { backgroundColor: accentColor },
              cartItemCount === 0 && { opacity: 0.5 },
            ]}
            onPress={() => {
              if (cartItemCount > 0) {
                onClose();
              }
            }}
            accessibilityLabel="Volver a la venta"
            accessibilityRole="button"
          >
            <Text style={thumbnailStyles.doneText}>
              Listo, volver a la venta
            </Text>
          </Pressable>
          <Pressable
            style={[thumbnailStyles.closeBtn, { backgroundColor: "#EF4444" }]}
            onPress={onClose}
            accessibilityLabel="Cerrar modal"
            accessibilityRole="button"
          >
            <Text style={thumbnailStyles.closeBtnText}>
              Cerrar
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const thumbnailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
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
    alignSelf: "center" as const,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800" as const,
    marginBottom: 5,
  },
  title: { fontSize: 24, fontWeight: "800" as const },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 6, paddingRight: 8 },
  search: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    marginBottom: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  productName: { fontSize: 17, fontWeight: "800" as const, marginBottom: 10 },
  stock: { fontSize: 11, fontWeight: "700" as const, marginTop: 3 },
  empty: { alignItems: "center" as const, paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700" as const },
  done: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    minHeight: 54,
    borderRadius: 18,
    marginTop: 12,
  },
  doneText: { fontSize: 15, fontWeight: "800" as const, color: "#FFFFFF" },
  closeBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    minHeight: 54,
    borderRadius: 18,
    marginTop: 10,
  },
  closeBtnText: { fontSize: 15, fontWeight: "800" as const, color: "#FFFFFF" },
});
