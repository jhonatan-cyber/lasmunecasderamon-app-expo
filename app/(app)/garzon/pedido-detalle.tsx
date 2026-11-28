import { ShotMixerSelector } from "@/components/shared/ShotMixerSelector";
import { BorderRadius } from "@/constants/spacing";
import { FontFamily } from '@/constants/fonts';
import { useCartStore } from "@/store/cartStore";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { GarzonProductConfigModal } from "@/components/garzon/productos/GarzonProductConfigModal";
import { HostessAssignmentSelector } from "@/components/garzon/productos/HostessAssignmentSelector";
import { RoomSelectModal } from "@/components/cajero/forms/RoomSelectModal";
import { useAccentColor } from "@/hooks/useAccentColor";
import { getHostessLimit, isExpensiveDrink } from "@/hooks/utils/cuentaUtils";
import { useGarzonOrderCheckout } from "@/hooks/useGarzonOrderCheckout";
import { PaymentMethodSelect } from "@/components/cajero/forms/PaymentMethodSelect";
import { PremiumAlert } from "@/components/ui/PremiumAlert";
import { apiClientSafe } from "@/api/client";
import { getMirror, MIRROR_KEYS, MIRROR_MAX_AGE_MS } from "@/services/mirror";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Anfitriona, MetodoPagoPedido, Room } from "@/types/cart";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PremiumHeader } from "@/components/ui/PremiumHeader";

const METODOS_PAGO_PEDIDO: MetodoPagoPedido[] = [
  "efectivo",
  "tarjeta",
  "transferencia",
];

export default function PedidoDetalleScreen() {
  const { bg, cardBg, borderColor, textPrimary, textSecondary, accentOnSurface, accentColor } =
    useAccentColor();
  const router = useRouter();
  const cart = useCartStore((state) => state.cart);
  const getTotal = useCartStore((state) => state.getTotal);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getAcompanamientoRecargo = useCartStore(
    (state) => state.getAcompanamientoRecargo,
  );
  const topeAcompanamiento = useCartStore((state) => state.topeAcompanamiento);
  const getTipAmount = useCartStore((state) => state.getTipAmount);
  const tipEnabled = useCartStore((state) => state.tipEnabled);
  const tipPercentage = useCartStore((state) => state.tipPercentage);
  const setTipEnabled = useCartStore((state) => state.setTipEnabled);
  const addToCart = useCartStore((state) => state.addToCart);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const updateItemMixer = useCartStore((state) => state.updateItemMixer);
  const updateItemBottleMixers = useCartStore((state) => state.updateItemBottleMixers);
  const updateItemRoom = useCartStore((state) => state.updateItemRoom);
  const {
    metodoPago,
    setMetodoPago,
    baucherFoto,
    takeBaucherPhoto,
    baucherPromptVisible,
    setBaucherPromptVisible,
    submitting,
    submitOrder,
  } = useGarzonOrderCheckout();
  const cartTotal = getTotal();
  const cartSubtotal = getSubtotal();
  const acompanamientoRecargo = getAcompanamientoRecargo(topeAcompanamiento);
  const tipAmount = getTipAmount();
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const insets = useSafeAreaInsets();
  const [hostesses, setHostesses] = useState<Anfitriona[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hostessProductId, setHostessProductId] = useState<string | null>(null);
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const controller = new AbortController();
    const readThroughMirror = (key: string, endpoint: string) =>
      getMirror().readThroughDetailed<any>(
        key,
        () => apiClientSafe(endpoint, { signal: controller.signal }),
        { maxAgeMs: MIRROR_MAX_AGE_MS.catalogo },
      );

    void Promise.allSettled([
      readThroughMirror(MIRROR_KEYS.anfitrionas, "/hostesses"),
      readThroughMirror(MIRROR_KEYS.roomsAvailable, "/rooms?status=1"),
    ]).then(([hostessResult, roomResult]) => {
      if (controller.signal.aborted) return;
      const getData = (result: PromiseSettledResult<{ data: any }>) => {
        if (result.status !== "fulfilled") return [];
        const data = result.value.data;
        if (Array.isArray(data?.data)) return data.data;
        return Array.isArray(data) ? data : [];
      };
      setHostesses(getData(hostessResult));
      setRooms(getData(roomResult));
    });

    return () => controller.abort();
  }, []);

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

  const hostessItems = useMemo(
    () => cart.filter((item) => Number(item.product.commission) > 0),
    [cart],
  );
  const roomItems = useMemo(
    () =>
      cart.filter(
        (item) =>
          Number(item.product.commission) > 0 && isExpensiveDrink(item.product),
      ),
    [cart],
  );
  const hostessModalItem = hostessItems.find(
    (item) => item.product.id === hostessProductId,
  );
  const selectedRoom = useMemo(
    () => roomItems.find((item) => item.selectedRoom)?.selectedRoom ?? null,
    [roomItems],
  );
  const maxHostesses = hostessModalItem
    ? hostessModalItem.product.tipo_venta === "shot"
      ? hostessModalItem.product.shot_anfitriona
        ? hostessModalItem.quantity
        : 0
      : getHostessLimit(hostessModalItem.product, hostessModalItem.quantity)
    : 0;

  const toggleExpanded = (productId: string) => {
    setExpandedProductIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  useEffect(() => {
    roomItems.forEach((item) => {
      if (item.selectedRoom !== selectedRoom) {
        updateItemRoom(item.product.id, selectedRoom);
      }
    });
  }, [roomItems, selectedRoom, updateItemRoom]);

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
          />
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {cart.map((item) => {
              const expanded = expandedProductIds.has(item.product.id);
              const itemMaxHostesses =
                item.product.tipo_venta === "shot"
                  ? item.product.shot_anfitriona
                    ? item.quantity
                    : 0
                  : getHostessLimit(item.product, item.quantity);
              return (
                <View
                  key={item.product.id}
                  style={[styles.itemRow, { backgroundColor: cardBg, borderColor }]}
                >
                  <Pressable
                    onPress={() => toggleExpanded(item.product.id)}
                    style={styles.itemHeader}
                    accessibilityRole="button"
                    accessibilityLabel={`${expanded ? "Contraer" : "Expandir"} detalles de ${item.product.name}`}
                    accessibilityState={{ expanded }}
                  >
                    <View style={{ flex: 1 }}>
                      <OrderLineInfo item={item} />
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={accentOnSurface}
                    />
                  </Pressable>
                  {expanded && (
                    <>
                      <ShotMixerSelector
                        compact
                        label="Bebida de acompañamiento"
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
                      {Number(item.product.commission) > 0 && (
                        <View style={{ gap: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ color: textPrimary, fontFamily: FontFamily.semibold }}>
                              Anfitrionas
                            </Text>
                            {item.selectedHostesses.length > 0 && (
                              <Text style={{ color: textSecondary, fontSize: 13 }}>
                                {item.selectedHostesses.length} de {itemMaxHostesses} seleccionadas
                              </Text>
                            )}
                          </View>
                          <HostessAssignmentSelector
                            hostesses={hostesses}
                            selectedIds={item.selectedHostesses}
                            max={itemMaxHostesses}
                            onPress={() => setHostessProductId(item.product.id)}
                            emptyLabel={`Seleccionar anfitriona(s) (máx ${itemMaxHostesses})`}
                            accessibilityLabel={`Asignar anfitrionas para ${item.product.name}`}
                            showSelectionCount={false}
                          />
                        </View>
                      )}
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
                    </>
                  )}
                </View>
              );
            })}
            <View
              style={[
                styles.checkoutOptions,
                { backgroundColor: cardBg, borderColor },
              ]}
            >
              {roomItems.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: textPrimary, fontFamily: FontFamily.semibold }}>
                    Habitación
                  </Text>
                  <Pressable
                    onPress={() => setRoomModalVisible(true)}
                    style={{
                      minHeight: 44,
                      justifyContent: "center",
                      padding: 12,
                      borderColor,
                      borderWidth: 1,
                      borderRadius: BorderRadius.full,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={selectedRoom ? "Cambiar habitación" : "Seleccionar habitación"}
                    accessibilityHint="Abre el selector de habitaciones"
                  >
                    {selectedRoom ? (
                      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                        <View
                          style={{
                            backgroundColor: `${accentOnSurface}18`,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: accentOnSurface,
                              fontFamily: FontFamily.medium,
                              fontSize: 13,
                            }}
                          >
                            {rooms.find((room) => String(room.id) === selectedRoom)?.name ?? "Habitación asignada"}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={{ color: textPrimary, fontFamily: FontFamily.medium }}>
                        Seleccionar habitación
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
              <PaymentMethodSelect
                methods={METODOS_PAGO_PEDIDO}
                selectedMethod={metodoPago}
                onSelect={(method) => setMetodoPago(method as MetodoPagoPedido)}
              />
              {metodoPago === "transferencia" && (
                <Pressable
                  onPress={() => void takeBaucherPhoto()}
                  style={[
                    styles.baucherRow,
                    {
                      borderColor: baucherFoto ? accentColor : borderColor,
                      backgroundColor: baucherFoto ? `${accentColor}14` : cardBg,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    baucherFoto
                      ? "Repetir foto del baucher"
                      : "Sacar foto del baucher (obligatoria)"
                  }
                >
                  {baucherFoto ? (
                    <Image source={{ uri: baucherFoto }} style={styles.baucherThumb} />
                  ) : (
                    <Ionicons name="camera-outline" size={20} color={accentOnSurface} />
                  )}
                  <Text style={{ color: accentOnSurface, fontFamily: FontFamily.semibold }}>
                    {baucherFoto
                      ? "Comprobante adjunto · tocar para reemplazar"
                      : "Adjuntar comprobante obligatorio"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setTipEnabled(!tipEnabled)}
                style={[styles.tipControl, { borderColor }]}
                accessibilityRole="button"
                accessibilityLabel={tipEnabled ? "Desactivar propina" : "Activar propina"}
                accessibilityState={{ selected: tipEnabled }}
              >
                <View>
                  <Text style={{ color: textPrimary, fontFamily: FontFamily.semibold }}>
                    Propina ({tipPercentage}%)
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 13 }}>
                    {tipEnabled ? "Agregar al total" : "No agregar propina"}
                  </Text>
                </View>
                <Text style={{ color: accentOnSurface, fontFamily: FontFamily.bold }}>
                  {tipEnabled ? "Sí" : "No"} · ${tipAmount.toLocaleString("es-CL")}
                </Text>
              </Pressable>
            </View>
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
                  ${(cartSubtotal - acompanamientoRecargo).toLocaleString("es-CL")}
                </Text>
              </View>
              {acompanamientoRecargo > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={{ color: textSecondary, flex: 1, fontSize: 12 }}>
                    Excedente de bebida
                  </Text>
                  <Text style={{ color: textPrimary, fontSize: 12 }}>
                    +${acompanamientoRecargo.toLocaleString("es-CL")}
                  </Text>
                </View>
              )}
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
              onPress={() => void submitOrder()}
              disabled={submitting}
              style={[
                styles.submitButton,
                { backgroundColor: accentColor, opacity: submitting ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Enviar pedido"
              accessibilityState={{ disabled: submitting }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Enviar pedido</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
      <GarzonProductConfigModal
        visible={Boolean(hostessModalItem)}
        productId={hostessModalItem?.product.id ?? ""}
        type="hostess"
        hostesses={hostesses}
        rooms={rooms}
        maxHostesses={maxHostesses}
        bottomInset={insets.bottom}
        onClose={() => setHostessProductId(null)}
      />
      <RoomSelectModal
        visible={roomModalVisible && roomItems.length > 0}
        onClose={() => setRoomModalVisible(false)}
        onSelect={(room) => {
          const roomId = String(room.id_habitacion || room.id);
          roomItems.forEach((item) => updateItemRoom(item.product.id, roomId));
          setRoomModalVisible(false);
        }}
        rooms={rooms.map((room) => ({
          id: room.id,
          nombre: room.name,
          precio: room.price ?? 0,
          tiempo: room.time ?? 0,
          estado: room.status ?? 1,
        }))}
        selectedRoomId={selectedRoom ?? undefined}
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
  itemHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkoutOptions: {
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  baucherRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  baucherThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  tipControl: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
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
  submitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});
