import { useCartDraft } from "@/hooks/useCartDraft";
import { contentColumn } from '@/constants/layout';
import { FontFamily } from '@/constants/fonts';
import { useCartStore } from "@/store/cartStore";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useRouter } from "expo-router";
import React from "react";
import { useStableCallback } from "@/hooks/useStableCallback";
import type { Product } from "@/types/cart";
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
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGarzonProductos } from "@/hooks/useGarzonProductos";
import {
  GarzonCartBar,
  GarzonProductosModales,
} from "@/components/garzon/productos";
import { GarzonOfflineBanner } from "@/components/garzon/GarzonOfflineBanner";

type ListItem =
  | { type: 'header'; key: string; categoria: string }
  | { type: 'product'; key: string; data: Product };

export default function ProductosScreen() {
  const draftCart = useCartStore((state) => state.cart);
  useCartDraft("orders", draftCart, (saved) =>
    useCartStore.setState({ cart: saved }),
  );
  const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary, accentOnSurface } =
    useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    categoryName,
    products,
    anfitrionas,
    rooms,
    clients,
    selectedClientId,
    setSelectedClientId,
    metodoPago,
    setMetodoPago,
    baucherFoto,
    baucherPromptVisible,
    setBaucherPromptVisible,
    takeBaucherPhoto,
    loading,
    refreshing,
    submitting,
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
    updateItemHostesses,
    updateItemRoom,
    tipEnabled,
    setTipEnabled,
    clearCart,
    tipAmount,
    cartTotal,
    propinaPct,
    onRefresh,
    getMaxHostesses,
    submitOrder,
  } = useGarzonProductos();

  const cartItemsByProductId = React.useMemo(
    () =>
      new Map(cart.map((cartItem) => [String(cartItem.product.id), cartItem])),
    [cart],
  );

  // Agrupa los productos por categoría manteniendo el orden de aparición.
  // Solo incluye categorías que tengan al menos un producto (el hook ya filtra stock > 0).
  const listItems = React.useMemo<ListItem[]>(() => {
    const groups = new Map<string, Product[]>();
    for (const p of products) {
      const cat = p.categoria || 'Sin categoría';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    const result: ListItem[] = [];
    for (const [cat, prods] of groups) {
      result.push({ type: 'header', key: `header:${cat}`, categoria: cat });
      for (const p of prods) {
        result.push({ type: 'product', key: String(p.id), data: p });
      }
    }
    return result;
  }, [products]);
  const handleProductConfig = useStableCallback(
    (productId: string, type: "hostess" | "room") => {
      setActiveConfigItem({ productId, type });
    },
  );

  const renderItem = useStableCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.categoryHeader}>
          <Text style={[styles.categoryHeaderText, { color: textSecondary }]}>
            {item.categoria}
          </Text>
        </View>
      );
    }
    const cartItem = cartItemsByProductId.get(String(item.data.id));
    return (
      <ProductCard
        product={item.data}
        cartItem={cartItem}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onConfigPress={handleProductConfig}
        anfitrionas={anfitrionas}
        rooms={rooms}
      />
    );
  });

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

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentOnSurface} />
        </View>
      ) : (
        <VirtualizedList
          data={listItems}
          extraData={cart}
          keyExtractor={(item: ListItem) => item.key}
          renderItem={renderItem}
          estimatedItemSize={150}
          getItemType={(item: ListItem) => item.type}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: cart.length > 0 ? 230 : 40 },
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
                {(() => {
                  const totalUnidades = cart.reduce((sum, item) => sum + item.quantity, 0);
                  const productoTxt = totalUnidades === 1 ? 'producto' : 'productos';
                  return (
                    <Text style={{ color: textPrimary, fontFamily: FontFamily.extrabold }}>
                      {totalUnidades} {productoTxt} en el pedido
                    </Text>
                  );
                })()}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="fast-food-outline"
              title="No hay productos disponibles en esta categoría"
            />
          }
        />
      )}

      {cart.length > 0 && (
        <GarzonCartBar
          tipEnabled={tipEnabled}
          setTipEnabled={setTipEnabled}
          metodoPago={metodoPago}
          setMetodoPago={setMetodoPago}
          baucherFoto={baucherFoto}
          onTakeBaucherPhoto={() => void takeBaucherPhoto()}
          tipAmount={tipAmount}
          tipPercentage={propinaPct}
          cartTotal={cartTotal}
          submitting={submitting}
          submitOrder={submitOrder}
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
        activeConfigItem={activeConfigItem}
        setActiveConfigItem={setActiveConfigItem}
        cart={cart}
        anfitrionas={anfitrionas}
        rooms={rooms}
        products={products}
        getMaxHostesses={getMaxHostesses}
        updateItemHostesses={updateItemHostesses}
        updateItemRoom={updateItemRoom}
        insets={insets}
        accentColor={accentColor}
        accentOnSurface={accentOnSurface}
        borderColor={borderColor}
        cardBg={cardBg}
        textPrimary={textPrimary}
      />
      <PremiumAlert
        visible={baucherPromptVisible}
        title="Foto del baucher"
        message="El pago por transferencia requiere la foto del baucher. ¿Tomarla ahora?"
        type="info"
        showCancel
        confirmText="Tomar foto"
        cancelText="Ahora no"
        onConfirm={() => {
          setBaucherPromptVisible(false);
          void takeBaucherPhoto();
        }}
        onCancel={() => setBaucherPromptVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { ...contentColumn, padding: 16 },
  categoryHeader: {
    paddingTop: 20,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  categoryHeaderText: {
    fontFamily: FontFamily.extrabold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
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
