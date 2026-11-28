import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from "@/hooks/useAccentColor";
import { getHostessLimit } from "@/hooks/utils/cuentaUtils";
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
import { GarzonProductConfigModal } from "@/components/garzon/productos/GarzonProductConfigModal";
import { HostessAssignmentSelector } from "@/components/garzon/productos/HostessAssignmentSelector";
import { useCartStore } from "@/store/cartStore";
import { haptic } from "@/utils/haptics";
import { FontFamily } from "@/constants/fonts";
import { BorderRadius } from "@/constants/spacing";
import { formatCurrency } from "@/utils/format";

export type { Anfitriona, CartItem, Product, Room };
interface ProductCardProps {
  product: Product;
  saleVariants?: Product[];
  cartItem?: CartItem;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onConfigPress: (productId: string, type: "hostess" | "room") => void;
  anfitrionas: Anfitriona[];
  rooms: Room[];
  layout?: 'list' | 'grid';
  activeConfigItem?: { productId: string; type: "hostess" | "room" } | null;
  onConfigClose?: () => void;
  bottomInset?: number;
}

function getSaleTypeLabel(product: Product): string {
  if (product.tipo_venta === "shot") {
    return product.shot_anfitriona ? "Corto anfitriona" : "Corto cliente";
  }
  return Number(product.commission) > 0
    ? "Botella con anfitriona"
    : "Botella sola";
}

export const ProductCard = React.memo(
  ({
    product,
    saleVariants,
    cartItem,
    onAdd,
    onRemove,
    onConfigPress,
    anfitrionas,
    rooms,
    layout = 'list',
    activeConfigItem = null,
    onConfigClose,
    bottomInset = 0,
  }: ProductCardProps) => {
    const { accentColor, cardBg, textPrimary, textSecondary, borderColor, accentOnSurface, isDark, accentText} =
      useAccentColor();
    const [open, setOpen] = useState(false);
    const [variantsExpanded, setVariantsExpanded] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState(product.id);
    const availableVariants = saleVariants?.length ? saleVariants : [product];
    const selectedVariant =
      availableVariants.find((variant) => variant.id === selectedVariantId) ||
      availableVariants[0];
    // Suscribirse al store para que el modal se actualice cuando el carrito cambie
    // (ej: al agregar producto desde dentro del modal con quantity === 0).
    const cart = useCartStore((state) => state.cart);
    const cartItemsByVariantId = new Map(
      cart.map((item) => [item.product.id, item]),
    );
    const storeCartItem = cartItemsByVariantId.get(selectedVariant.id);
    const getVariantQuantity = (variant: Product) =>
      cartItemsByVariantId.get(variant.id)?.quantity ??
      (cartItem?.product.id === variant.id ? cartItem.quantity : 0);
    // Guardar referencia al cartItem anterior para detectar cuando se limpia
    const prevCartRef = React.useRef({
      productId: selectedVariant.id,
      item: storeCartItem,
    });
    const wasCleared =
      storeCartItem === undefined &&
      prevCartRef.current.productId === selectedVariant.id &&
      prevCartRef.current.item !== undefined;
    prevCartRef.current = { productId: selectedVariant.id, item: storeCartItem };
    // Guardar referencia al length anterior del carrito para detectar cuando se limpia
    const prevCartLengthRef = React.useRef(cart.length);
    const cartWasCleared = cart.length === 0 && prevCartLengthRef.current > 0;
    prevCartLengthRef.current = cart.length;
    // Limpiar selecciones al vaciar el carrito o quitar la modalidad activa.
    // En grupos, mantener abierto el modal para continuar agregando opciones.
    useEffect(() => {
      if (cartWasCleared || wasCleared) {
        setLocalQty(0);
        setPendingShortMixers([]);
        setPendingBottleMixers(undefined);
        if (open && availableVariants.length === 1) {
          setOpen(false);
        }
      }
    }, [availableVariants.length, cartWasCleared, wasCleared, open]);
    // Usar el item del store si está disponible, sino la prop (para compatibilidad).
    // Si se detectó que se limpió, forzar un cartItem vacío para borrar selecciones.
    const effectiveCartItem = wasCleared
      ? undefined
      : storeCartItem ||
        (cartItem?.product.id === selectedVariant.id ? cartItem : undefined);
    const selectedProduct = effectiveCartItem?.product || selectedVariant;
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
    const reservedBottleStock = cart
      .filter(
        (item) =>
          item.product.presentacion_id === selectedProduct.presentacion_id &&
          item.product.tipo_venta !== "shot",
      )
      .reduce((sum, item) => sum + item.quantity, 0);
    const canIncreaseQuantity = isShort
      ? selectedQty < 99
      : selectedProduct.stock_bar == null ||
        reservedBottleStock + localQty < Number(selectedProduct.stock_bar);
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
    const saleTypeLabel = getSaleTypeLabel(selectedProduct);
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
    const handleOpen = (variant?: Product) => {
      const variantInCart = availableVariants.find(
        (variant) => (cartItemsByVariantId.get(variant.id)?.quantity ?? 0) > 0,
      );
      setSelectedVariantId(variant?.id ?? variantInCart?.id ?? availableVariants[0].id);
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
      useCartStore.getState().updateItemShortMixers(selectedProduct.id, next);
    };

    // El reparto de sabores de botella se configura una vez por línea.
    const applyPendingBottleMixers = () => {
      if (quantity > 0) return;
      if (pendingBottleMixers?.length)
        useCartStore
          .getState()
          .updateItemBottleMixers(selectedProduct.id, pendingBottleMixers);
    };

    // Si el usuario configura anfitriona/habitación antes de pulsar "Agregar",
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
    const hostessSelector = hasCommission ? (
      <HostessAssignmentSelector
        hostesses={anfitrionas}
        selectedIds={quantity > 0 ? effectiveCartItem?.selectedHostesses ?? [] : []}
        max={hostessLimit}
        onPress={() => handleConfigure("hostess")}
        disabled={!canConfigure}
        emptyLabel={
          quantity > 0
            ? `Cambiar anfitrionas (máx ${hostessLimit})`
            : canConfigure
              ? `Seleccionar anfitriona(s) (máx ${hostessLimit})`
              : `Seleccionar anfitriona (máx ${hostessLimitPerUnit})`
        }
      />
    ) : null;

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
    const productHeader = (
      <>
        {layout === 'grid' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OrderProductPhoto foto={product.foto} name={product.name} />
            {availableVariants.length > 1 && (
              <Ionicons
                name={variantsExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={accentOnSurface}
              />
            )}
          </View>
        ) : (
          <OrderProductPhoto foto={product.foto} name={product.name} />
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          {availableVariants.length === 1 ? (
            <View style={{ alignSelf: "flex-start", gap: 4 }}>
              {!!product.categoria && (
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: accentOnSurface + "18",
                    borderRadius: BorderRadius.full,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: accentOnSurface,
                      fontFamily: FontFamily.bold,
                      fontSize: 10,
                    }}
                    numberOfLines={1}
                  >
                    {product.categoria}
                  </Text>
                </View>
              )}
              {!!product.presentacion_nombre && (
                <View
                  style={{
                    alignSelf: "flex-start",
                    borderColor: accentOnSurface + "40",
                    borderRadius: BorderRadius.full,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      color: accentOnSurface,
                      fontFamily: FontFamily.semibold,
                      fontSize: 10,
                    }}
                    numberOfLines={1}
                  >
                    {product.presentacion_nombre}
                  </Text>
                </View>
              )}
            </View>
          ) : !!product.categoria ? (
            <Text
              style={{ color: textSecondary, fontSize: 11 }}
              numberOfLines={1}
            >
              {product.categoria}
            </Text>
          ) : null}
          <Text
            style={{ color: textPrimary, fontFamily: FontFamily.extrabold }}
            numberOfLines={2}
          >
            {product.producto_nombre || product.name}
          </Text>
          {availableVariants.length > 1 && !!product.presentacion_nombre && (
            <Text style={{ color: textSecondary }} numberOfLines={1}>
              {product.presentacion_nombre}
            </Text>
          )}
          {availableVariants.length === 1 && (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: accentOnSurface + "18",
                borderRadius: BorderRadius.full,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: accentOnSurface,
                  fontFamily: FontFamily.bold,
                  fontSize: 10,
                }}
              >
                {saleTypeLabel}
              </Text>
            </View>
          )}
          {availableVariants.length === 1 && quantity > 0 && (
            <Text style={{ color: textSecondary }} numberOfLines={1}>
              {quantity} en pedido
            </Text>
          )}
          {availableVariants.length === 1 && (
            <Text
              style={{
                color: accentOnSurface,
                fontFamily: FontFamily.bold,
                fontSize: 15,
              }}
            >
              {formatCurrency(product.price)}
            </Text>
          )}
        </View>
        {layout === 'list' && availableVariants.length > 1 && (
          <Ionicons
            name={variantsExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={accentOnSurface}
          />
        )}
      </>
    );
    const productHeaderStyle = {
      flexDirection: layout === 'grid' ? 'column' as const : 'row' as const,
      gap: 12,
      alignItems: layout === 'grid' ? 'stretch' as const : 'center' as const,
      padding: layout === 'grid' ? 12 : 16,
    };
    const productCardStyle = {
      backgroundColor: cardBg,
      borderColor,
      borderWidth: 1,
      borderRadius: BorderRadius.card,
      marginBottom: 12,
      flex: layout === 'grid' ? 1 : undefined,
      minHeight: layout === 'grid' ? 176 : undefined,
      overflow: "hidden" as const,
      ...cardNeonGlow,
    };

    return (
      <>
        {availableVariants.length === 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Configurar ${product.name}`}
            onPress={() => handleOpen()}
            style={[productCardStyle, productHeaderStyle]}
          >
            {productHeader}
          </Pressable>
        ) : (
          <View style={productCardStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${variantsExpanded ? "Contraer" : "Expandir"} opciones de venta de ${product.name}`}
              accessibilityState={{ expanded: variantsExpanded }}
              onPress={() => setVariantsExpanded((expanded) => !expanded)}
              style={productHeaderStyle}
            >
              {productHeader}
            </Pressable>
            {variantsExpanded && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                {availableVariants.map((variant) => {
                  const variantQuantity = getVariantQuantity(variant);
                  return (
                    <Pressable
                      key={variant.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir ${getSaleTypeLabel(variant)} · ${formatCurrency(variant.price)}`}
                      onPress={() => handleOpen(variant)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        minHeight: 48,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: BorderRadius.card,
                        borderWidth: 1,
                        borderColor,
                        backgroundColor: accentOnSurface + "08",
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <Text
                          style={{ color: textPrimary, fontFamily: FontFamily.bold }}
                          numberOfLines={1}
                        >
                          {getSaleTypeLabel(variant)}
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 12 }}>
                          {formatCurrency(variant.price)}
                          {variantQuantity > 0 ? ` · ${variantQuantity} en pedido` : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={accentOnSurface} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
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
                    onConfigClose?.();
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
                    effectiveCartItem || {
                      product: selectedProduct,
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
                      accessibilityLabel={`Disminuir ${selectedProduct.name}`}
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
                      accessibilityLabel={`Aumentar ${selectedProduct.name}`}
                      accessibilityHint={
                        canIncreaseQuantity ? undefined : "No hay más stock disponible"
                      }
                      disabled={!canIncreaseQuantity}
                      onPress={() => {
                        haptic.tap();
                        setLocalQty((q) => q + 1);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{
                        padding: 6,
                        minWidth: 44,
                        minHeight: 44,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: canIncreaseQuantity ? 1 : 0.45,
                      }}
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
                {!isShort && hostessSelector}
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
                    disabled={selectedQty <= 0}
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
                          .updateItemShortMixers(selectedProduct.id, next);
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
                            .updateItemBottleMixers(selectedProduct.id, sabores)
                    }
                  />
                )}
                {isShort && hostessSelector}
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
                  {(selectedProduct.price * selectedQty).toLocaleString("es-CL")}
                </Text>
              </View>
              <Pressable
                onPress={handleAgregar}
                disabled={selectedQty === 0}
                style={{
                  backgroundColor: accentColor,
                  padding: 14,
                  borderRadius: BorderRadius.full,
                  opacity: selectedQty > 0 ? 1 : 0.5,
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
                    : "Agregar"}
                </Text>
              </Pressable>
            </View>
          </View>
          {activeConfigItem?.productId === selectedProduct.id && (
            <GarzonProductConfigModal
              visible={open}
              productId={selectedProduct.id}
              type={activeConfigItem.type}
              hostesses={anfitrionas}
              rooms={rooms}
              maxHostesses={hostessLimit}
              bottomInset={bottomInset}
              onClose={() => onConfigClose?.()}
            />
          )}
        </Modal>
      </>
    );
  },
);
ProductCard.displayName = "ProductCard";
