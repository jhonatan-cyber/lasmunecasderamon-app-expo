import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useAccentColor } from "@/hooks/useAccentColor";
import { isExpensiveDrink, getHostessLimit } from "@/hooks/utils/cuentaUtils";
import type { Anfitriona, CartItem, Product, Room } from "@/types/cart";
import { OrderProductPhoto } from "./OrderProductPhoto";
import { ShotMixerSelector } from "./ShotMixerSelector";
import { OrderLineInfo } from "@/components/garzon/productos/OrderLineInfo";
import { useCartStore } from "@/store/cartStore";

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
    const hasCommission = Number(selectedProduct.commission) > 0;
    const hostessLimit =
      selectedProduct.tipo_venta === "shot"
        ? quantity
        : getHostessLimit(selectedProduct, quantity);
    const configure = (type: "hostess" | "room") => {
      setOpen(false);
      onConfigPress(product.id, type);
    };
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Configurar ${product.name}`}
          onPress={() => setOpen(true)}
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
            <Text style={{ color: textSecondary, fontSize: 11 }}>
              {product.categoria}
            </Text>
            <Text style={{ color: textPrimary, fontWeight: "800" }}>
              {product.producto_nombre || product.name}
            </Text>
            <Text style={{ color: textSecondary }}>
              {product.presentacion_nombre}
            </Text>
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
                }}
              >
                <Text
                  style={{
                    color: textPrimary,
                    fontSize: 18,
                    fontWeight: "800",
                  }}
                >
                  Configurar producto
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
                      quantity: 1,
                      selectedHostesses: [],
                      selectedRoom: null,
                    }
                  }
                  anfitrionas={anfitrionas}
                  rooms={rooms}
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <Pressable
                    disabled={quantity === 0}
                    accessibilityLabel={`Disminuir ${product.name}`}
                    onPress={() => onRemove(product.id)}
                    style={{ padding: 10 }}
                  >
                    <Ionicons
                      name="remove-circle"
                      size={30}
                      color={quantity ? accentColor : textSecondary}
                    />
                  </Pressable>
                  <Text style={{ color: textPrimary, fontWeight: "800" }}>
                    {quantity} en pedido
                  </Text>
                  <Pressable
                    accessibilityLabel={`Aumentar ${product.name}`}
                    onPress={() => onAdd(selectedProduct)}
                    style={{ padding: 10 }}
                  >
                    <Ionicons name="add-circle" size={30} color={accentColor} />
                  </Pressable>
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
                        <Text style={{ color: textPrimary }}>
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
                          <Text style={{ color: textPrimary }}>
                            Seleccionar habitación
                          </Text>
                        </Pressable>
                      )}
                  </>
                )}
              </ScrollView>
              <Text
                style={{
                  color: "#10B981",
                  fontWeight: "900",
                  fontSize: 22,
                  textAlign: "right",
                }}
              >
                $
                {(selectedProduct.price * Math.max(1, quantity)).toLocaleString(
                  "es-CL",
                )}
              </Text>
              <Pressable
                onPress={() => {
                  if (!quantity) onAdd(selectedProduct);
                  else setOpen(false);
                }}
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
                    fontWeight: "800",
                  }}
                >
                  {quantity ? "Aceptar" : "Agregar al pedido"}
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
