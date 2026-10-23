import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { useCartDraft } from "@/hooks/useCartDraft";
import { useCartStore } from "@/store/cartStore";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useRouter } from "expo-router";
import React from "react";
import { useStableCallback } from "@/hooks/useStableCallback";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
} from "react-native";
import FlashList from "@/components/shared/FlashList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/shared/ProductCard";
import type { Product } from "@/types/cart";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { useGarzonProductos } from "@/hooks/useGarzonProductos";
import {
  GarzonCartBar,
  GarzonProductosModales,
} from "@/components/garzon/productos";
import { GarzonOfflineBanner } from "@/components/garzon/GarzonOfflineBanner";

export default function ProductosScreen() {
  const draftCart = useCartStore((state) => state.cart);
  const clearDraft = useCartDraft("orders", draftCart, (saved) =>
    useCartStore.setState({ cart: saved }),
  );
  const { accentColor, bg, cardBg, borderColor, textPrimary, textSecondary } =
    useAccentColor();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cartVisible, setCartVisible] = React.useState(false);

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
  const handleProductConfig = useStableCallback(
    (productId: string, type: "hostess" | "room") => {
      setActiveConfigItem({ productId, type });
    },
  );

  const renderItem = useStableCallback(({ item }: { item: Product }) => {
    const cartItem = cartItemsByProductId.get(String(item.id));

    return (
      <ProductCard
        product={item}
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
        rightComponent={
          <View style={styles.headerActions}>
            {cart.length > 0 && (
              <Pressable
                onPress={() => setClearCartAlertVisible(true)}
                style={styles.clearBtn}
              >
                <Ionicons name="trash-outline" size={20} color="#FF4444" />
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                clearDraft();
                clearCart();
                router.back();
              }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.backText}>Atrás</Text>
            </Pressable>
          </View>
        }
      />

      <GarzonOfflineBanner />

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <FlashList
          data={products}
          extraData={cart}
          keyExtractor={(item: Product) => String(item.id)}
          renderItem={renderItem}
          estimatedItemSize={150}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: cart.length > 0 ? 180 : 40 },
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
                  setCartVisible(true);
                }}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  borderRadius: 16,
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor,
                }}
              >
                <Text style={{ color: textPrimary, fontWeight: "800" }}>
                  Ver pedido completo ·{" "}
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} unidades
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="fast-food-outline"
                size={48}
                color={textSecondary}
              />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No hay productos disponibles en esta categoría
              </Text>
            </View>
          }
        />
      )}

      {cart.length > 0 && (
        <GarzonCartBar
          tipEnabled={tipEnabled}
          setTipEnabled={setTipEnabled}
          tipAmount={tipAmount}
          tipPercentage={propinaPct}
          cartTotal={cartTotal}
          submitting={submitting}
          submitOrder={submitOrder}
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
        getMaxHostesses={getMaxHostesses}
        updateItemHostesses={updateItemHostesses}
        updateItemRoom={updateItemRoom}
        insets={insets}
        accentColor={accentColor}
        borderColor={borderColor}
        cardBg={cardBg}
        textPrimary={textPrimary}
      />
      <Modal
        visible={cartVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCartVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              maxHeight: "90%",
              backgroundColor: cardBg,
              borderRadius: 24,
              padding: 20,
              gap: 16,
            }}
          >
            <Text
              style={{ color: textPrimary, fontSize: 20, fontWeight: "800" }}
            >
              Detalle del pedido
            </Text>
            <ScrollView contentContainerStyle={{ gap: 20 }}>
              {cart.map((item) => (
                <View
                  key={item.product.id}
                  style={{
                    borderBottomWidth: 1,
                    borderColor,
                    paddingBottom: 16,
                  }}
                >
                  <OrderLineInfo
                    item={item}
                    anfitrionas={anfitrionas}
                    rooms={rooms}
                  />
                  <ShotMixerSelector
                    compact
                    bottle={item.product.tipo_venta !== "shot"}
                    items={[
                      {
                        ...item.product,
                        nombre: item.product.name,
                        cantidad: item.quantity,
                      },
                    ]}
                    onChange={(_, mixer) =>
                      useCartStore
                        .getState()
                        .updateItemMixer(item.product.id, mixer)
                    }
                  />
                  {item.product.commission > 0 && (
                    <Pressable
                      onPress={() => {
                        setCartVisible(false);
                        setActiveConfigItem({
                          productId: item.product.id,
                          type: "hostess",
                        });
                      }}
                      style={{ paddingVertical: 8 }}
                    >
                      <Text style={{ color: accentColor }}>
                        Seleccionar anfitriona
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
            <Text style={{ color: textSecondary }}>
              Propina: ${tipAmount.toLocaleString("es-CL")}
            </Text>
            <Text
              style={{ color: textPrimary, fontSize: 20, fontWeight: "800" }}
            >
              Total: ${cartTotal.toLocaleString("es-CL")}
            </Text>
            <Pressable
              onPress={() => setCartVisible(false)}
              style={{
                backgroundColor: accentColor,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: "#FFF",
                  textAlign: "center",
                  fontWeight: "800",
                }}
              >
                Cerrar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16 },
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
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  emptyContainer: { alignItems: "center", padding: 40, marginTop: 40 },
  emptyText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
});
