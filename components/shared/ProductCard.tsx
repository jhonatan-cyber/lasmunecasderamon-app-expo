import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from "@/hooks/useAccentColor";
import { isExpensiveDrink, getHostessLimit } from "@/hooks/utils/cuentaUtils";
import {
  bottleMixerUnits,
  hostessMixerMl,
  requiresShortMixer,
} from "@/hooks/utils/productConfiguration";
import type {
  AcompanamientoBotellaItem,
  Anfitriona,
  CartItem,
  Product,
  Room,
} from "@/types/cart";
import { OrderProductPhoto } from "./OrderProductPhoto";
import { ShotMixerSelector, type ShortMixer } from "./ShotMixerSelector";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useCartStore } from "@/store/cartStore";
import { haptic } from "@/utils/haptics";
import { FontFamily } from "@/constants/fonts";
import { BorderRadius } from "@/constants/spacing";

export type { Anfitriona, CartItem, Product, Room };
interface ProductCardProps {
  product: Product;
  cartItem?: CartItem;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onConfigPress: (productId: string, type: "hostess" | "room") => void;
  anfitrionas: Anfitriona[];
  rooms: Room[];
}

export const ProductCard = React.memo(
  ({
    product,
    cartItem,
    onAdd,
    onRemove,
    onConfigPress,
    anfitrionas,
    rooms,
  }: ProductCardProps) => {
    const { accentColor, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, isDark, accentText} =
      useAccentColor();
    const [open, setOpen] = useState(false);
    // Suscribirse al store para que el modal se actualice cuando el carrito cambie
    // (ej: al agregar producto desde dentro del modal con quantity === 0).
    const cart = useCartStore((state) => state.cart);
    const storeCartItem = cart.find((i) => i.product.id === product.id);
    // Guardar referencia al cartItem anterior para detectar cuando se limpia
    const prevCartRef = React.useRef(storeCartItem);
    const wasCleared = storeCartItem === undefined && prevCartRef.current !== undefined;
    prevCartRef.current = storeCartItem;
    // Guardar referencia al length anterior del carrito para detectar cuando se limpia
    const prevCartLengthRef = React.useRef(cart.length);
    const cartWasCleared = cart.length === 0 && prevCartLengthRef.current > 0;
    prevCartLengthRef.current = cart.length;
    // Cerrar el modal y limpiar selecciones cuando se limpie el carrito.
    // Siempre se limpian los pending mixers y localQty, independientemente
    // de si el modal está abierto, para que al volver a abrir esté limpio.
    useEffect(() => {
      if (cartWasCleared || wasCleared) {
        setLocalQty(0);
        setPendingShortMixers([]);
        setPendingBottleMixers(undefined);
        if (open) {
          setOpen(false);
        }
      }
    }, [cartWasCleared, wasCleared, open]);
    // Usar el item del store si está disponible, sino la prop (para compatibilidad).
    // Si se detectó que se limpió, forzar un cartItem vacío para borrar selecciones.
    const effectiveCartItem = wasCleared ? undefined : (storeCartItem || cartItem);
    const selectedProduct = effectiveCartItem?.product || product;
    const quantity = effectiveCartItem?.quantity || 0;
    // Inicia en 0 para que el usuario elija la cantidad
    const [localQty, setLocalQty] = useState(0);
    // El contador muestra las unidades totales seleccionadas: las que ya
    // están en el pedido más las pendientes del contador.
    const selectedQty = quantity + localQty;
    // Acompañamiento elegido antes de agregar el producto al pedido. Se aplica
    // al carrito recién cuando el producto se suma, igual que en el dashboard.
    // Para cortos hay una bebida por unidad: el índice es el corto a agregar.
    const [pendingShortMixers, setPendingShortMixers] = useState<
      (ShortMixer | undefined)[]
    >([]);
    const [pendingBottleMixers, setPendingBottleMixers] = useState<
      AcompanamientoBotellaItem[] | undefined
    >();
    const isShort = selectedProduct.tipo_venta === "shot";
    // Bebida actual de cada unidad que ya está en el carrito. Los items
    // antiguos guardaban una sola bebida para toda la línea.
    const currentShortMixers: (ShortMixer | undefined)[] = Array.from(
      { length: quantity },
      (_, index) =>
        effectiveCartItem?.shortMixers !== undefined
          ? effectiveCartItem.shortMixers[index]
          : selectedProduct.acompanamiento_corto,
    );
    const hasCommission = Number(selectedProduct.commission) > 0;
    // Límite total de anfitrionas basado en la cantidad (para validación).
    const hostessLimit =
      selectedProduct.tipo_venta === "shot"
        ? selectedQty
        : getHostessLimit(selectedProduct, selectedQty);
    // Límite por unidad del producto (para mostrar en el selector).
    const hostessLimitPerUnit =
      selectedProduct.tipo_venta === "shot"
        ? 1
        : (selectedProduct.max_anfitrionas !== null && selectedProduct.max_anfitrionas !== undefined && selectedProduct.max_anfitrionas > 0
            ? selectedProduct.max_anfitrionas
            : 1);
    // Solo se monta el selector si el producto realmente lleva acompañamiento;
    // así el modal no consulta el bar para productos que no lo necesitan.
    const needsMixer =
      selectedProduct.tipo_venta === "shot"
        ? requiresShortMixer(selectedProduct)
        : bottleMixerUnits(selectedProduct) > 0;
    // Corto anfitriona sin ml configurados: el dashboard avisa en el modal que
    // falta esa configuración en vez de mostrar una lista de bebidas.
    const missingHostessMixerMl =
      selectedProduct.tipo_venta === "shot" &&
      Boolean(selectedProduct.shot_anfitriona) &&
      hostessMixerMl(selectedProduct) <= 0;
    const handleOpen = () => {
      haptic.tap();
      setLocalQty(0);
      setPendingShortMixers([]);
      setPendingBottleMixers(undefined);
      setOpen(true);
    };
    // Garantizar que al abrir el modal, las selecciones pendientes estén limpias
    // incluso si el carrito se vaciÃ³ mientras el modal estaba cerrado.
    useEffect(() => {
      if (open) {
        setPendingShortMixers([]);
        setPendingBottleMixers(undefined);
        setLocalQty(0);
      }
    }, [open]);

    const clearPendingMixers = () => {
      setPendingShortMixers([]);
      setPendingBottleMixers(undefined);
    };

    // Aplica las bebidas elegidas para las unidades nuevas. Debe llamarse
    // después de sumar las unidades para que el item exista en el carrito.
    const applyPendingShortMixers = (baseQuantity: number, added: number) => {
      if (!isShort || added <= 0) return;
      const next = [
        ...Array.from({ length: baseQuantity }, (_, index) =>
          effectiveCartItem?.shortMixers !== undefined
            ? effectiveCartItem.shortMixers[index]
            : effectiveCartItem?.product.acompanamiento_corto,
        ),
        ...Array.from(
          { length: added },
          (_, index) => pendingShortMixers[index],
        ),
      ];
      useCartStore.getState().updateItemShortMixers(product.id, next);
    };

    // El reparto de sabores de botella se configura una vez por línea.
    const applyPendingBottleMixers = () => {
      if (quantity > 0) return;
      if (pendingBottleMixers?.length)
        useCartStore
          .getState()
          .updateItemBottleMixers(product.id, pendingBottleMixers);
    };

    // Si el usuario configura anfitriona/habitación antes de pulsar "Listo",
    // las unidades del contador deben existir en el carrito para que el
    // selector del garzón pueda asignarlas. Se materializan en ese momento y
    // se conservan sus acompañamientos pendientes.
    const materializeDraftUnits = () => {
      if (localQty <= 0) return;
      const added = isShort ? Math.min(localQty, 99 - quantity) : localQty;
      for (let i = 0; i < added; i++) onAdd(selectedProduct);
      applyPendingShortMixers(quantity, added);
      applyPendingBottleMixers();
      setLocalQty(0);
      clearPendingMixers();
    };

    const handleConfigure = (type: "hostess" | "room") => {
      if (selectedQty <= 0) return;
      // El modal de configuración trabaja sobre el carrito, así que primero
      // se suman las unidades elegidas en el contador.
      if (localQty > 0) materializeDraftUnits();
      onConfigPress(selectedProduct.id, type);
    };

    const canConfigure = selectedQty > 0;

    const handleAgregar = () => {
      if (localQty > 0) {
        // Los cortos se guardan agrupados por producto, pero cada unidad
        // conserva su propia bebida hasta separar el pedido.
        const added = isShort ? Math.min(localQty, 99 - quantity) : localQty;
        for (let i = 0; i < added; i++) onAdd(selectedProduct);
        applyPendingShortMixers(quantity, added);
        applyPendingBottleMixers();
        haptic.success();
      } else {
        haptic.tap();
      }
      setLocalQty(0);
      clearPendingMixers();
      setOpen(false);
    };

    // Glow neón en modo oscuro
    const cardNeonGlow = isDark ? {
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      borderColor: accentColor,
      borderWidth: 1.5,
    } : {};

    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Configurar ${product.name}`}
          onPress={() => handleOpen()}
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            backgroundColor: cardBg,
            borderColor,
            borderWidth: 1,
            borderRadius: BorderRadius.card,
            padding: 16,
            marginBottom: 12,
            ...cardNeonGlow,
          }}
        >
          <OrderProductPhoto foto={product.foto} name={product.name} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            {!!product.categoria && (
              <Text
                style={{ color: textSecondary, fontSize: 11 }}
                numberOfLines={1}
              >
                {product.categoria}
              </Text>
            )}
            <Text
              style={{ color: textPrimary, fontFamily: FontFamily.extrabold }}
              numberOfLines={2}
            >
              {product.producto_nombre || product.name}
            </Text>
            {!!product.presentacion_nombre && (
              <Text style={{ color: textSecondary }} numberOfLines={1}>
                {product.presentacion_nombre}
              </Text>
            )}
            <Text style={{ color: textPrimary }} numberOfLines={1}>
              {product.tipo_venta === "shot"
                ? product.shot_anfitriona
                  ? "Corto anfitriona"
                  : "Corto cliente"
                : hasCommission
                  ? "Botella con anfitriona"
                  : "Botella sola"}
              {quantity > 0 ? ` · ${quantity} en pedido` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={accentOnSurface} />
        </Pressable>
        <Modal
          visible={open}
          transparent
          animationType="slide"
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
                backgroundColor: cardBg,
                borderRadius: BorderRadius.card,
                padding: 20,
                maxHeight: "90%",
                gap: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 18,
                    fontFamily: FontFamily.extrabold,
                  }}
                >
                  Agregar al pedido
                </Text>
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    setLocalQty(0);
                    clearPendingMixers();
                    setOpen(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close" size={24} color={textSecondary} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={{ gap: 16 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <OrderLineInfo
                  item={
                    cartItem || {
                      product,
                      quantity: 0,
                      selectedHostesses: [],
                      selectedRoom: null,
                    }
                  }
                />
                <View style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <Pressable
                      disabled={selectedQty <= 0}
                      accessibilityLabel={`Disminuir ${product.name}`}
                      onPress={() => {
                        haptic.tap();
                        // Primero se descuentan las unidades pendientes; si ya
                        // no hay, se quita una unidad del pedido para que el
                        // contador visible siempre coincida con la selección.
                        if (localQty > 0) {
                          setLocalQty((q) => Math.max(0, q - 1));
                          return;
                        }
                        if (quantity > 0) onRemove(selectedProduct.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 6, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={32}
                        color={selectedQty > 0 ? accentColor : textSecondary}
                      />
                    </Pressable>
                    <Text style={{ color: textPrimary, fontFamily: FontFamily.bold, fontSize: 20, minWidth: 32, textAlign: 'center' }}>
                      {selectedQty}
                    </Text>
                    <Pressable
                      accessibilityLabel={`Aumentar ${product.name}`}
                      onPress={() => {
                        haptic.tap();
                        setLocalQty((q) => q + 1);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 6, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="add-circle" size={32} color={accentOnSurface} />
                    </Pressable>
                  </View>

                  {/* Acceso rápido a cantidades frecuentes para ritmo nocturno */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary, fontFamily: FontFamily.regular, fontSize: 12 }}>
                      Rápido:
                    </Text>
                    {[1, 2, 5, 10].map((addNum) => (
                      <Pressable
                        key={addNum}
                        onPress={() => {
                          haptic.tap();
                          setLocalQty((q) => q + addNum);
                        }}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 12,
                          backgroundColor: `${accentColor}15`,
                          borderWidth: 1,
                          borderColor: `${accentColor}35`,
                          minHeight: 34,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: accentOnSurface, fontFamily: FontFamily.bold, fontSize: 13 }}>
                          +{addNum}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                {hasCommission && (
                  <Pressable
                    onPress={() => handleConfigure("hostess")}
                    disabled={!canConfigure}
                    style={{
                      padding: 12,
                      borderColor,
                      borderWidth: 1,
                      borderRadius: BorderRadius.card,
                      opacity: canConfigure ? 1 : 0.5,
                    }}
                  >
                    {quantity > 0 && effectiveCartItem?.selectedHostesses && effectiveCartItem.selectedHostesses.length > 0 ? (
                      <View style={{ gap: 6 }}>
                        <Text style={{ color: textSecondary, fontSize: 12, fontFamily: FontFamily.medium }}>
                          {effectiveCartItem.selectedHostesses.length} de {hostessLimit} seleccionada(s)
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                          {effectiveCartItem.selectedHostesses.map((hostessId) => {
                            const hostess = anfitrionas.find((a) => a.id === hostessId);
                            return (
                              <View key={hostessId} style={{ backgroundColor: accentOnSurface + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                <Text style={{ color: accentOnSurface, fontFamily: FontFamily.medium, fontSize: 13 }}>
                                  {hostess?.nick || hostessId}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <Text style={{ color: textPrimary, fontFamily: FontFamily.medium }}>
                        {quantity > 0
                          ? `Cambiar anfitrionas (máx ${hostessLimit})`
                          : canConfigure
                            ? `Seleccionar anfitriona(s) (máx ${hostessLimit})`
                            : `Seleccionar anfitriona (máx ${hostessLimitPerUnit})`}
                      </Text>
                    )}
                  </Pressable>
                )}
                {hasCommission &&
                  selectedProduct.tipo_venta !== "shot" &&
                  isExpensiveDrink(selectedProduct) && (
                    <Pressable
                      onPress={() => handleConfigure("room")}
                      disabled={!canConfigure}
                      style={{
                        padding: 12,
                        borderColor,
                        borderWidth: 1,
                        borderRadius: BorderRadius.card,
                        opacity: canConfigure ? 1 : 0.5,
                      }}
                    >
                      {quantity > 0 && effectiveCartItem?.selectedRoom ? (
                        <View style={{ gap: 6 }}>
                          <Text style={{ color: textSecondary, fontSize: 12, fontFamily: FontFamily.medium }}>
                            Habitación seleccionada
                          </Text>
                          <View style={{ backgroundColor: accentOnSurface + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                            <Text style={{ color: accentOnSurface, fontFamily: FontFamily.medium, fontSize: 13 }}>
                              {rooms.find((r) => r.id === effectiveCartItem.selectedRoom)?.name || effectiveCartItem.selectedRoom}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <Text style={{ color: textPrimary, fontFamily: FontFamily.medium }}>
                          {quantity > 0 ? "Cambiar habitación" : "Seleccionar habitación"}
                        </Text>
                      )}
                    </Pressable>
                  )}
                {missingHostessMixerMl && (
                  <View
                    style={{
                      backgroundColor: '#F59E0B15',
                      borderColor: '#F59E0B55',
                      borderWidth: 1,
                      borderRadius: BorderRadius.card,
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: '#F59E0B', fontSize: 12 }}>
                      Configura los ml de bebida para corto anfitriona en este
                      producto.
                    </Text>
                  </View>
                )}
                {open && needsMixer && (
                  <ShotMixerSelector
                    compact
                    bottle={!isShort}
                    items={
                      isShort
                        ? Array.from(
                            { length: Math.max(1, selectedQty) },
                            (_, index) => {
                              const totalUnits = selectedQty;
                              const mixer =
                                index < quantity
                                  ? currentShortMixers[index]
                                  : pendingShortMixers[index - quantity];
                              return {
                                ...selectedProduct,
                                nombre: selectedProduct.name,
                                cantidad: 1,
                                ...(totalUnits > 1
                                  ? { unidad: index + 1 }
                                  : {}),
                                ...(mixer
                                  ? { acompanamiento_corto: mixer }
                                  : {}),
                              };
                            },
                          )
                        : [
                            {
                              ...selectedProduct,
                              nombre: selectedProduct.name,
                              cantidad: Math.max(1, selectedQty),
                              ...(quantity === 0 && pendingBottleMixers
                                ? {
                                    acompanamiento_botella:
                                      pendingBottleMixers,
                                  }
                                : {}),
                            },
                          ]
                    }
                    onChange={(index, mixer) => {
                      if (!isShort) return;
                      if (index < quantity) {
                        const next = [...currentShortMixers];
                        next[index] = mixer;
                        useCartStore
                          .getState()
                          .updateItemShortMixers(product.id, next);
                        return;
                      }
                      const pendingIndex = index - quantity;
                      setPendingShortMixers((previous) => {
                        const next = [...previous];
                        next[pendingIndex] = mixer;
                        return next;
                      });
                    }}
                    onChangeBottle={(_, sabores) =>
                      quantity === 0
                        ? setPendingBottleMixers(sabores)
                        : useCartStore
                            .getState()
                            .updateItemBottleMixers(product.id, sabores)
                    }
                  />
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: textSecondary, fontFamily: FontFamily.medium, fontSize: 14 }}>
                  {quantity > 0 ? "Total en pedido:" : "Subtotal:"}
                </Text>
                <Text
                  style={{
                    color: accentOnSurface,
                    fontFamily: FontFamily.bold,
                    fontSize: 22,
                  }}
                >
                  $
                  {(() => {
                    return (selectedProduct.price * selectedQty).toLocaleString("es-CL");
                  })()}
                </Text>
              </View>
              <Pressable
                onPress={handleAgregar}
                disabled={selectedQty === 0}
                style={{
                  backgroundColor: accentColor,
                  padding: 14,
                  borderRadius: 14,
                  opacity: selectedQty === 0 ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: accentText,
                    textAlign: "center",
                    fontFamily: FontFamily.bold,
                    fontSize: 16,
                  }}
                >
                  {localQty > 0
                    ? (quantity > 0 ? `Agregar +${localQty} al pedido` : `Agregar ${localQty} al pedido`)
                    : (quantity > 0 ? `Listo (${quantity} en pedido)` : "Listo")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptic.tap();
                  setLocalQty(0);
                  clearPendingMixers();
                  setOpen(false);
                }}
                style={{
                  backgroundColor: 'transparent',
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: textSecondary,
                }}
              >
                <Text
                  style={{
                    color: textSecondary,
                    textAlign: "center",
                    fontFamily: FontFamily.bold,
                    fontSize: 16,
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </>
    );
  },
);
ProductCard.displayName = "ProductCard";
