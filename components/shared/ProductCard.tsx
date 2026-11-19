import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AppModal as Modal } from '@/components/ui/AppModal';
import { useAccentColor } from "@/hooks/useAccentColor";
import { isExpensiveDrink, getHostessLimit } from "@/hooks/utils/cuentaUtils";
import type { Anfitriona, CartItem, Product, Room } from "@/types/cart";
import { OrderProductPhoto } from "./OrderProductPhoto";
import { ShotMixerSelector } from "./ShotMixerSelector";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useCartStore } from "@/store/cartStore";
import { haptic } from "@/utils/haptics";
import { FontFamily } from "@/constants/fonts";

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
    const { accentColor, cardBg, textPrimary, textSecondary, borderColor } =
      useAccentColor();
    const [open, setOpen] = useState(false);
    const selectedProduct = cartItem?.product || product;
    const quantity = cartItem?.quantity || 0;
    // Si ya está en carrito inicia en 0 para configurar; si es nuevo, arranca en 1
    const [localQty, setLocalQty] = useState(quantity > 0 ? 0 : 1);
    const hasCommission = Number(selectedProduct.commission) > 0;
    const hostessLimit =
      selectedProduct.tipo_venta === "shot"
        ? (quantity + localQty)
        : getHostessLimit(selectedProduct, quantity + localQty);
    const configure = (type: "hostess" | "room") => {
      setOpen(false);
      onConfigPress(product.id, type);
    };

    const handleOpen = () => {
      haptic.tap();
      setLocalQty(quantity > 0 ? 0 : 1);
      setOpen(true);
    };

    const handleAgregar = () => {
      if (localQty > 0) {
        for (let i = 0; i < localQty; i++) onAdd(selectedProduct);
        haptic.success();
      } else {
        haptic.tap();
      }
      setLocalQty(0);
      setOpen(false);
    };
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
            borderRadius: 20,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <OrderProductPhoto foto={product.foto} name={product.name} />
          <View style={{ flex: 1, gap: 4 }}>
            {!!product.categoria && (
              <Text style={{ color: textSecondary, fontSize: 11 }}>
                {product.categoria}
              </Text>
            )}
            <Text style={{ color: textPrimary, fontWeight: "800" }}>
              {product.producto_nombre || product.name}
            </Text>
            {!!product.presentacion_nombre && (
              <Text style={{ color: textSecondary }}>
                {product.presentacion_nombre}
              </Text>
            )}
            <Text style={{ color: textPrimary }}>
              {product.tipo_venta === "shot"
                ? product.shot_anfitriona
                  ? "Corto anfitriona"
                  : "Corto cliente"
                : "Botella"}
              {quantity > 0 ? ` · ${quantity} en pedido` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={accentColor} />
        </Pressable>
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
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
                borderRadius: 24,
                padding: 20,
                maxHeight: "90%",
                gap: 14,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: textPrimary,
                    fontSize: 18,
                    fontWeight: "800",
                    flex: 1,
                  }}
                >
                  Agregar al pedido
                </Text>
                <Pressable
                  accessibilityLabel="Cerrar producto"
                  onPress={() => setOpen(false)}
                >
                  <Ionicons name="close" size={24} color={textPrimary} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={{ gap: 16 }}
                keyboardShouldPersistTaps="handled"
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
                  anfitrionas={anfitrionas}
                  rooms={rooms}
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
                      disabled={quantity === 0 ? localQty <= 1 : localQty === 0}
                      accessibilityLabel={`Disminuir ${product.name}`}
                      onPress={() => {
                        haptic.tap();
                        setLocalQty((q) => Math.max(quantity === 0 ? 1 : 0, q - 1));
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 6, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={32}
                        color={(quantity === 0 ? localQty > 1 : localQty > 0) ? accentColor : textSecondary}
                      />
                    </Pressable>
                    <Text style={{ color: textPrimary, fontFamily: FontFamily.bold, fontSize: 20, minWidth: 32, textAlign: 'center' }}>
                      {localQty}
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
                      <Ionicons name="add-circle" size={32} color={accentColor} />
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
                        <Text style={{ color: accentColor, fontFamily: FontFamily.bold, fontSize: 13 }}>
                          +{addNum}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                {quantity > 0 && (
                  <>
                    <ShotMixerSelector
                      compact
                      bottle={selectedProduct.tipo_venta !== "shot"}
                      items={[
                        {
                          ...selectedProduct,
                          nombre: selectedProduct.name,
                          cantidad: quantity,
                        },
                      ]}
                      onChange={(_, mixer) =>
                        useCartStore
                          .getState()
                          .updateItemMixer(product.id, mixer)
                      }
                      onChangeBottle={(_, sabores) =>
                        useCartStore
                          .getState()
                          .updateItemBottleMixers(product.id, sabores)
                      }
                    />
                    {hasCommission && (
                      <Pressable
                        onPress={() => configure("hostess")}
                        style={{
                          padding: 12,
                          borderColor,
                          borderWidth: 1,
                          borderRadius: 12,
                        }}
                      >
                        <Text style={{ color: textPrimary, fontFamily: FontFamily.medium }}>
                          {cartItem?.selectedHostesses.length || 0} de{" "}
                          {hostessLimit} anfitrionas seleccionadas · Cambiar
                        </Text>
                      </Pressable>
                    )}
                    {hasCommission &&
                      selectedProduct.tipo_venta !== "shot" &&
                      isExpensiveDrink(selectedProduct) && (
                        <Pressable
                          onPress={() => configure("room")}
                          style={{ padding: 12 }}
                        >
                          <Text style={{ color: textPrimary, fontFamily: FontFamily.medium }}>
                            Seleccionar habitación
                          </Text>
                        </Pressable>
                      )}
                  </>
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: textSecondary, fontFamily: FontFamily.medium, fontSize: 14 }}>
                  {localQty > 0 ? (quantity > 0 ? "Adicional:" : "Subtotal:") : (quantity > 0 ? "Total en pedido:" : "Precio:")}
                </Text>
                <Text
                  style={{
                    color: "#10B981",
                    fontFamily: FontFamily.bold,
                    fontSize: 22,
                  }}
                >
                  $
                  {(selectedProduct.price * (localQty > 0 ? localQty : (quantity || 1))).toLocaleString(
                    "es-CL",
                  )}
                </Text>
              </View>
              <Pressable
                onPress={handleAgregar}
                style={{
                  backgroundColor: accentColor,
                  padding: 14,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    color: "#FFF",
                    textAlign: "center",
                    fontFamily: FontFamily.bold,
                    fontSize: 16,
                  }}
                >
                  {localQty > 0
                    ? (quantity > 0 ? `Agregar +${localQty} al pedido` : `Agregar ${localQty} al pedido`)
                    : (quantity > 0 ? `Listo (${quantity} en pedido)` : "Cerrar")}
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
