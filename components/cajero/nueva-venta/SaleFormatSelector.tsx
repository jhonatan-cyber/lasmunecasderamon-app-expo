import { esCortoAnfitriona } from "@/hooks/utils/hostessShortPrices";
import { BorderRadius } from '@/constants/spacing';
import { FontFamily } from '@/constants/fonts';
import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OpcionVentaProducto, SaleChoice } from "@/hooks/utils/saleChoice";

type Props = {
  product: any;
  options: OpcionVentaProducto[];
  shotMl: number;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  cardBg: string;
  cart: any[];
  onAdd: (choice: SaleChoice, cantidad: number) => void;
  onRemove: (choice: SaleChoice) => void;
};

/**
 * Contador +/- vinculado al carrito: el botón "+" agrega al carrito,
 * el "-" remueve del carrito, y el contador muestra cuántos hay en el carrito.
 */
export function SaleFormatSelector({
  product,
  options,
  shotMl,
  accentColor,
  textPrimary,
  textSecondary,
  borderColor,
  cardBg,
  cart,
  onAdd,
  onRemove,
}: Props) {
  const productId = String(product.id || product.id_producto);
  const mlCliente =
    Number(product?.ml_shot) > 0 ? Number(product.ml_shot) : shotMl;
  const mlAnfitriona =
    Number(product?.ml_shot_anfitriona) > 0
      ? Number(product.ml_shot_anfitriona)
      : mlCliente;

  // Contar cuántos de este producto+formato hay en el carrito
  const getCartCount = (choice: SaleChoice) => {
    return cart.reduce((sum, cartItem) => {
      const itemProductId = String(cartItem.id || cartItem.id_producto || cartItem.producto_id || "");
      if (itemProductId !== productId) return sum;
      // El tipo_venta en el carrito puede ser "shot" o "botella", y el choice puede ser más específico
      const cartTipo = cartItem.tipo_venta || cartItem.tipoVenta || "botella";
      const choiceIsShot = esCortoAnfitriona(choice) || choice === "shot";
      const cartIsShot = cartTipo === "shot";
      if (choiceIsShot !== cartIsShot) return sum;
      // Para shots, verificar si es anfitriona
      if (choiceIsShot) {
        const cartAnfitriona = cartItem.shot_anfitriona ?? false;
        const choiceAnfitriona = esCortoAnfitriona(choice);
        if (cartAnfitriona !== choiceAnfitriona) return sum;
      }
      // Para botellas, verificar si tiene anfitriona
      if (!choiceIsShot) {
        const choiceHasAnfitriona = choice !== "botella_sin_anfitriona";
        const cartHasAnfitriona = cartItem.botella_anfitriona ?? true;
        if (choiceHasAnfitriona !== cartHasAnfitriona) return sum;
      }
      return sum + (cartItem.quantity || 1);
    }, 0);
  };

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const cantidad = getCartCount(option.value);
        const max = option.esShot ? 99 : Number(product?.stock_bar ?? 0);
        const ml = esCortoAnfitriona(option.value) ? mlAnfitriona : mlCliente;
        const label = `${option.nombre}${option.esShot ? ` · ${ml} ml` : ""}`;
        return (
          <View
            key={option.value}
            style={[styles.row, { backgroundColor: cardBg, borderColor }]}
          >
            <View style={styles.info}>
              <Text
                style={[styles.name, { color: textPrimary }]}
                numberOfLines={1}
              >
                {label}
              </Text>
              <Text style={[styles.meta, { color: textSecondary }]}>
                ${option.precio.toLocaleString()}
                {option.comision > 0
                  ? ` · comisión $${option.comision.toLocaleString()}`
                  : ""}
              </Text>
            </View>
            <View style={styles.controls}>
              <Pressable
                onPress={() => onRemove(option.value)}
                disabled={cantidad === 0}
                accessibilityRole="button"
                accessibilityLabel={`${label}: quitar del carrito`}
                style={[
                  styles.step,
                  { borderColor, opacity: cantidad === 0 ? 0.4 : 1 },
                ]}
              >
                <Ionicons name="remove" size={15} color={textPrimary} />
              </Pressable>
              <Text style={[styles.count, { color: textPrimary }]}>
                {cantidad}
              </Text>
              <Pressable
                onPress={() => onAdd(option.value, 1)}
                disabled={max < 1 || cantidad >= max}
                accessibilityRole="button"
                accessibilityLabel={`${label}: agregar al carrito`}
                style={[
                  styles.step,
                  {
                    borderColor,
                    opacity: max < 1 || cantidad >= max ? 0.4 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={15} color={textPrimary} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8, gap: 7 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    padding: 8,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 11, fontFamily: "900" as any },
  meta: { fontSize: 10, fontFamily: FontFamily.semibold, marginTop: 2 },
  controls: { flexDirection: "row", alignItems: "center", gap: 5 },
  step: {
    width: 28,
    height: 28,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  count: { minWidth: 18, textAlign: "center", fontSize: 12, fontFamily: FontFamily.black },
  add: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 2,
  },
});
