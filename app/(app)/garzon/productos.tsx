import { useCartDraft } from "@/hooks/useCartDraft";
import { contentColumn } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { useCartStore } from "@/store/cartStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { useStableCallback } from "@/hooks/useStableCallback";
import { getHostessLimit } from "@/hooks/utils/cuentaUtils";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import VirtualizedList from "@/components/shared/VirtualizedList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/shared/ProductCard";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { EmployeeListError } from "@/components/shared/EmployeeListError";
import { useGarzonProductos } from "@/hooks/useGarzonProductos";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import {
  groupProductsByPresentation,
  type ProductPresentationGroup,
} from "@/utils/productPresentationGroups";
import { groupProductPresentationRows } from "@/utils/productPresentationRows";
import {
  GarzonCartBar,
  GarzonProductosModales,
} from "@/components/garzon/productos";
import { GarzonOfflineBanner } from "@/components/garzon/GarzonOfflineBanner";
import { GarzonProductConfigModal } from "@/components/garzon/productos/GarzonProductConfigModal";

type ListItem =
  { type: 'products'; key: string; data: ProductPresentationGroup[] };

export default function ProductosScreen() {
  const draftCart = useCartStore((state) => state.cart);
  useCartDraft("orders", draftCart, (saved) =>
    useCartStore.setState({ cart: saved }),
  );
  const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary, accentOnSurface } =
    useAccentColor();
  const router = useRouter();
  const routeParams = useLocalSearchParams<{
    configureProductId?: string | string[];
    configureType?: string | string[];
    search?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useResponsiveMetrics();
  const columnas = isTablet || isLandscape ? 3 : 2;
  const initialSearch = Array.isArray(routeParams.search)
    ? routeParams.search[0]
    : routeParams.search;
  const [searchText, setSearchText] = React.useState(initialSearch || '');
  const [cartBarHeight, setCartBarHeight] = React.useState(0);

  const {
    categoryName,
    products,
    anfitrionas,
    rooms,
    clients,
    selectedClientId,
    setSelectedClientId,
    loading,
    refreshing,
    error,
    fromCache,
    clientModalVisible,
    setClientModalVisible,
    clearCartAlertVisible,
    setClearCartAlertVisible,
    activeConfigItem,
    setActiveConfigItem,
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    cartTotal,
    onRefresh,
  } = useGarzonProductos();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedClient = clients.find(
    (client) => String(client.id_cliente || client.id) === selectedClientId,
  );
  const selectedClientName = selectedClient
    ? `${selectedClient.nombre || selectedClient.name || ""} ${selectedClient.apellido || selectedClient.lastName || ""}`.trim() || "Cliente sin nombre"
    : null;

  const configureProductId = Array.isArray(routeParams.configureProductId)
    ? routeParams.configureProductId[0]
    : routeParams.configureProductId;
  const configureType = Array.isArray(routeParams.configureType)
    ? routeParams.configureType[0]
    : routeParams.configureType;
  const requestedConfigItem: {
    productId: string;
    type: "hostess" | "room";
  } | null = configureProductId
    ? {
        productId: configureProductId,
        type: configureType === "room" ? "room" : "hostess",
      }
    : null;

  const requestedCartItem = requestedConfigItem
    ? cart.find((item) => item.product.id === requestedConfigItem.productId)
    : undefined;
  const requestedMaxHostesses = requestedCartItem
    ? requestedCartItem.product.tipo_venta === "shot"
      ? requestedCartItem.product.shot_anfitriona
        ? requestedCartItem.quantity
        : 0
      : getHostessLimit(requestedCartItem.product, requestedCartItem.quantity)
    : 0;

  const productGroups = React.useMemo(
    () => groupProductsByPresentation(products),
    [products],
  );
  const requestedProductIds =
    requestedConfigItem?.type === "room"
      ? productGroups.find((group) =>
          group.variants.some(
            (variant) => variant.id === requestedConfigItem.productId,
          ),
        )?.variants.map((variant) => variant.id)
      : undefined;
  const filteredProductGroups = React.useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase();
    if (!search) return productGroups;

    return productGroups.filter((group) =>
      group.variants.some((product) =>
        [product.name, product.producto_nombre, product.presentacion_nombre, product.categoria]
          .some((value) => value?.toLocaleLowerCase().includes(search)),
      ),
    );
  }, [productGroups, searchText]);

  // Agrupa los productos por categoría manteniendo el orden de aparición.
  const listItems = React.useMemo<ListItem[]>(() => {
    const groups = new Map<string, ProductPresentationGroup[]>();
    for (const productGroup of filteredProductGroups) {
      const cat = productGroup.variants[0].categoria || 'Sin categoría';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(productGroup);
    }
    const result: ListItem[] = [];
    for (const [cat, productGroups] of groups) {
      const rows = groupProductPresentationRows(productGroups, columnas);
      rows.forEach((row, index) => {
        result.push({
          type: 'products',
          key: `products:${cat}:${index}`,
          data: row,
        });
      });
    }
    return result;
  }, [filteredProductGroups, columnas]);
  const handleProductConfig = useStableCallback(
    (productId: string, type: "hostess" | "room") => {
      setActiveConfigItem({ productId, type });
    },
  );

  const renderItem = React.useCallback(({ item }: { item: ListItem }) => {
    return (
      <View style={styles.productRow}>
        {item.data.map((productGroup) => {
          const hasMultipleSaleVariants = productGroup.variants.length > 1;
          const configTarget =
            activeConfigItem &&
            productGroup.variants.some(
              (variant) => variant.id === activeConfigItem.productId,
            )
              ? activeConfigItem
              : null;
          return (
            <View
              key={productGroup.key}
              style={
                hasMultipleSaleVariants
                  ? styles.fullWidthProductCell
                  : styles.productCell
              }
            >
              <ProductCard
                product={productGroup.variants[0]}
                saleVariants={productGroup.variants}
                layout={hasMultipleSaleVariants ? "list" : "grid"}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onConfigPress={handleProductConfig}
                anfitrionas={anfitrionas}
                rooms={rooms}
                activeConfigItem={configTarget}
                onConfigClose={() => setActiveConfigItem(null)}
                bottomInset={insets.bottom}
              />
            </View>
          );
        })}
        {item.data.length < columnas && item.data[0].variants.length === 1 &&
          Array.from({ length: columnas - item.data.length }, (_, index) => (
            <View key={`empty:${index}`} style={styles.productCell} />
          ))}
      </View>
    );
  }, [
    activeConfigItem,
    addToCart,
    anfitrionas,
    columnas,
    handleProductConfig,
    insets.bottom,
    removeFromCart,
    rooms,
    setActiveConfigItem,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title={categoryName || "Productos"}
        subtitle={
          fromCache
            ? "Catálogo guardado en el dispositivo"
            : "Seleccionar productos para el pedido"
        }
        connectionStatus={
          fromCache ? { isConnected: false, label: "Modo Offline" } : undefined
        }
        onBack={() => {
          router.back();
        }}
        rightComponent={
          cart.length > 0 ? (
            <Pressable
              onPress={() => setClearCartAlertVisible(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Vaciar pedido"
            >
              <Ionicons name="trash-outline" size={20} color="#FF0000" />
            </Pressable>
          ) : undefined
        }
      />

      <GarzonOfflineBanner />

      <View style={styles.searchContainer}>
        <Pressable
          onPress={() => setClientModalVisible(true)}
          style={[styles.clientSelector, { backgroundColor: cardBg, borderColor }]}
          accessibilityRole="button"
          accessibilityLabel={
            selectedClientName
              ? `Cambiar cliente asociado: ${selectedClientName}`
              : "Asociar cliente al pedido (opcional)"
          }
          accessibilityHint={
            selectedClientName
              ? "Abre el selector para cambiar o quitar el cliente del pedido"
              : "El cliente es opcional y se asociará a este pedido"
          }
        >
          <Ionicons
            name={selectedClientName ? "person-circle-outline" : "person-add-outline"}
            size={22}
            color={accentOnSurface}
          />
          <View style={styles.clientSelectorText}>
            <Text style={{ color: textSecondary, fontSize: 12, fontFamily: FontFamily.semibold }}>
              Cliente del pedido (opcional)
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: textPrimary, fontFamily: FontFamily.extrabold }}
            >
              {selectedClientName || "Sin cliente asociado"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSecondary} />
        </Pressable>
        <SearchBar
          compact
          placeholder="Buscar producto..."
          value={searchText}
          onChangeText={setSearchText}
          onClear={() => setSearchText('')}
          accessibilityLabel="Buscar productos"
          autoCapitalize="none"
        />
      </View>

      {(loading || refreshing) && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentOnSurface} />
        </View>
      ) : error && products.length === 0 ? (
        <EmployeeListError message={error} onRetry={onRefresh} />
      ) : (
        <>
          {error ? <EmployeeListError message={error} onRetry={onRefresh} /> : null}
          <VirtualizedList
            data={listItems}
            extraData={[cart, activeConfigItem]}
            keyExtractor={(item: ListItem) => item.key}
            renderItem={renderItem}
            estimatedItemSize={150}
            getItemType={(item: ListItem) => item.type}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: cart.length > 0 ? Math.max(cartBarHeight, 160) + 16 : 40 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
              />
            }
            ListHeaderComponent={
              cart.length > 0 ? (
                <Pressable
                  onPress={() => {
                    useCartStore.getState().splitShorts();
                    router.push('/(app)/garzon/pedido-detalle');
                  }}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    borderRadius: 16,
                    backgroundColor: cardBg,
                    borderWidth: 1,
                    borderColor,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver detalle del pedido"
                >
                  <Text style={{ color: textPrimary, fontFamily: FontFamily.extrabold }}>
                    {itemCount} {itemCount === 1 ? 'producto' : 'productos'} en el pedido
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                icon="fast-food-outline"
                title={searchText.trim() ? 'No se encontraron productos' : 'No hay productos disponibles en esta categoría'}
              />
            }
          />
        </>
      )}

      {cart.length > 0 && (
        <GarzonCartBar
          itemCount={itemCount}
          onBarHeightChange={(height) => setCartBarHeight(height)}
          cartTotal={cartTotal}
          onViewCart={() => {
            useCartStore.getState().splitShorts();
            router.push('/(app)/garzon/pedido-detalle');
          }}
          insets={insets}
          accentColor={accentColor}
          borderColor={borderColor}
          cardBg={cardBg}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />
      )}

      <GarzonProductosModales
        clientModalVisible={clientModalVisible}
        setClientModalVisible={setClientModalVisible}
        clients={clients}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        clearCartAlertVisible={clearCartAlertVisible}
        setClearCartAlertVisible={setClearCartAlertVisible}
        clearCart={clearCart}
        setActiveConfigItem={setActiveConfigItem}
      />
      {requestedConfigItem && requestedCartItem ? (
        <GarzonProductConfigModal
          visible={!loading}
          productId={requestedConfigItem.productId}
          productIds={requestedProductIds}
          type={requestedConfigItem.type}
          hostesses={anfitrionas}
          rooms={rooms}
          maxHostesses={requestedMaxHostesses}
          bottomInset={insets.bottom}
          onClose={() =>
            router.setParams({
              configureProductId: undefined,
              configureType: undefined,
            })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { ...contentColumn, padding: 16 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 8 },
  clientSelector: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
  },
  clientSelectorText: { flex: 1, minWidth: 0, gap: 2 },
  productRow: { flexDirection: 'row', gap: 12 },
  productCell: { flex: 1, minWidth: 0 },
  fullWidthProductCell: { width: '100%', minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    borderRadius: 9999,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    gap: 6,
  },
  backText: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
