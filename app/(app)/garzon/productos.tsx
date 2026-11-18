import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { useCartDraft } from "@/hooks/useCartDraft";
import { contentColumn } from '@/constants/layout';
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
  ScrollView,
} from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import VirtualizedList from "@/components/shared/VirtualizedList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/shared/ProductCard";
import type { Product } from "@/types/cart";
import { PremiumHeader } from "@/components/ui/PremiumHeader";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { EmptyState } from "@/components/ui/EmptyState";
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
        onBack={() => {
          clearDraft();
          clearCart();
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
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
            </Pressable>
          ) : undefined
        }
      />

      <GarzonOfflineBanner />

      {loading && products.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <VirtualizedList
          data={products}
          extraData={cart}
          keyExtractor={(item: Product) => String(item.id)}
          renderItem={renderItem}
          estimatedItemSize={150}
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
                    onChangeBottle={(_, sabores) =>
                      useCartStore
                        .getState()
                        .updateItemBottleMixers(item.product.id, sabores)
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
  listContent: { ...contentColumn, padding: 16 },
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
});
