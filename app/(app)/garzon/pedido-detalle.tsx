import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { FontFamily } from '@/constants/fonts';
import { useCartStore } from "@/store/cartStore";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PremiumHeader } from "@/components/ui/PremiumHeader";

export default function PedidoDetalleScreen() {
  const { bg, cardBg, borderColor, textPrimary, textSecondary, accentOnSurface, accentColor } =
    useAccentColor();
  const router = useRouter();
  const cart = useCartStore((state) => state.cart);
  const getTotal = useCartStore((state) => state.getTotal);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTipAmount = useCartStore((state) => state.getTipAmount);
  const tipEnabled = useCartStore((state) => state.tipEnabled);
  const tipPercentage = useCartStore((state) => state.tipPercentage);
  const addToCart = useCartStore((state) => state.addToCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateItemMixer = useCartStore((state) => state.updateItemMixer);
  const updateItemBottleMixers = useCartStore((state) => state.updateItemBottleMixers);
  const cartTotal = getTotal();
  const cartSubtotal = getSubtotal();
  const tipAmount = getTipAmount();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const insets = useSafeAreaInsets();

  const canIncreaseQuantity = (item: (typeof cart)[number]) => {
    if (item.product.tipo_venta === "shot") return item.quantity < 99;
    if (item.product.stock_bar === undefined) return true;
    const reserved = cart
      .filter(
        (cartItem) =>
          cartItem.product.presentacion_id === item.product.presentacion_id &&
          cartItem.product.tipo_venta !== "shot",
      )
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0);
    return reserved < item.product.stock_bar;
  };

  const addUnit = (item: (typeof cart)[number]) => {
    const state = useCartStore.getState();
    const previous = state.cart.find(
      (cartItem) => cartItem.product.id === item.product.id,
    );
    addToCart(item.product);

    const updated = useCartStore
      .getState()
      .cart.find((cartItem) => cartItem.product.id === item.product.id);
    if (
      item.product.tipo_venta === "shot" &&
      previous?.shortMixers !== undefined &&
      updated &&
      updated.quantity > previous.quantity
    ) {
      useCartStore.getState().updateItemShortMixers(
        item.product.id,
        Array.from(
          { length: updated.quantity },
          (_, index) =>
            previous.shortMixers?.[index] ?? item.product.acompanamiento_corto,
        ),
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <PremiumHeader
        title="Detalle del pedido"
        subtitle={`${itemCount} ${itemCount === 1 ? "unidad" : "unidades"}`}
        onBack={() => router.back()}
      />
      {cart.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContent}>
          <EmptyState
            icon="cart-outline"
            title="Tu pedido está vacío"
            message="Agrega productos desde el catálogo para continuar."
            actionLabel="Volver a productos"
            onAction={() => router.back()}
          />
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {cart.map((item) => (
              <View
                key={item.product.id}
                style={[styles.itemRow, { backgroundColor: cardBg, borderColor }]}
              >
                <OrderLineInfo item={item} />
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
                    updateItemMixer(item.product.id, mixer)
                  }
                  onChangeBottle={(_, sabores) =>
                    updateItemBottleMixers(item.product.id, sabores)
                  }
                />
                <View style={styles.quantityRow}>
                  <Text style={{ color: textPrimary, fontFamily: FontFamily.semibold }}>
                    Cantidad
                  </Text>
                  <View style={styles.quantityControls}>
                    <Pressable
                      onPress={() => removeFromCart(item.product.id)}
                      style={[styles.quantityButton, { borderColor }]}
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.quantity === 1
                          ? `Quitar ${item.product.name} del pedido`
                          : `Reducir cantidad de ${item.product.name}`
                      }
                    >
                      <Ionicons name="remove" size={20} color={accentOnSurface} />
                    </Pressable>
                    <Text
                      style={[styles.quantityValue, { color: textPrimary }]}
                      accessibilityLabel={`Cantidad de ${item.product.name}`}
                    >
                      {item.quantity}
                    </Text>
                    <Pressable
                      onPress={() => addUnit(item)}
                      disabled={!canIncreaseQuantity(item)}
                      style={[
                        styles.quantityButton,
                        { borderColor, opacity: canIncreaseQuantity(item) ? 1 : 0.45 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Aumentar cantidad de ${item.product.name}`}
                      accessibilityHint={
                        canIncreaseQuantity(item) ? undefined : "No hay más stock disponible"
                      }
                    >
                      <Ionicons name="add" size={20} color={accentOnSurface} />
                    </Pressable>
                  </View>
                </View>
                {item.product.commission > 0 && (
                  <View style={styles.hostessRow}>
                    <Text style={{ color: textSecondary, flex: 1 }}>
                      {item.selectedHostesses.length === 0
                        ? "Falta anfitriona"
                        : `${item.selectedHostesses.length} anfitriona${item.selectedHostesses.length === 1 ? "" : "s"} asignada${item.selectedHostesses.length === 1 ? "" : "s"}`}
                    </Text>
                    <Pressable
                      onPress={() =>
                        router.navigate({
                          pathname: "/(app)/garzon/productos",
                          params: {
                            categoryId: item.product.category_id,
                            categoryName: item.product.categoria ?? "",
                            configureProductId: item.product.id,
                            configureType: "hostess",
                          },
                        })
                      }
                      style={styles.hostessAction}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.selectedHostesses.length === 0 ? "Asignar anfitriona" : "Cambiar anfitrionas"} para ${item.product.name}`}
                    >
                      <Text style={{ color: accentOnSurface, fontFamily: FontFamily.semibold }}>
                        {item.selectedHostesses.length === 0
                          ? "Asignar anfitriona"
                          : "Cambiar anfitrionas"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <View
            style={[
              styles.footer,
              {
                backgroundColor: cardBg,
                borderTopColor: borderColor,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={{ color: textSecondary }}>Subtotal</Text>
                <Text style={{ color: textPrimary, fontFamily: FontFamily.semibold }}>
                  ${cartSubtotal.toLocaleString("es-CL")}
                </Text>
              </View>
              {tipEnabled && (
                <View style={styles.summaryRow}>
                  <Text style={{ color: textSecondary }}>Propina ({tipPercentage}%)</Text>
                  <Text style={{ color: textPrimary }}>
                    ${tipAmount.toLocaleString("es-CL")}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: borderColor }]}>
                <Text style={[styles.totalLabel, { color: textPrimary }]}>Total a pagar</Text>
                <Text style={[styles.totalText, { color: textPrimary }]}>
                  ${cartTotal.toLocaleString("es-CL")}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={[styles.backButton, { borderColor: accentColor, backgroundColor: `${accentColor}14` }]}
              accessibilityRole="button"
              accessibilityLabel="Volver a productos"
            >
              <Ionicons name="arrow-back" size={18} color={accentOnSurface} />
              <Text style={[styles.backText, { color: accentOnSurface }]}>Volver a productos</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },
  itemRow: {
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
  },
  quantityValue: {
    minWidth: 24,
    textAlign: "center",
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  hostessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  hostessAction: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  summary: {
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: FontFamily.semibold,
  },
  totalText: {
    fontSize: 22,
    fontFamily: FontFamily.extrabold,
  },
  backButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
  },
  backText: {
    fontSize: 15,
    fontFamily: FontFamily.semibold,
  },
});
