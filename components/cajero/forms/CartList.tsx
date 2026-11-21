import { useAccentColor } from "@/hooks/useAccentColor";
import { useRenderCount } from "@/hooks/useRenderCount";
import { haptic } from "@/utils/haptics";
import { FontFamily } from "@/constants/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { CartItem as SharedCartItem } from "@lasmunecasderamon/types";

export type CartItem = SharedCartItem & { quantity?: number };

interface CartListProps {
  items: CartItem[];
  onUpdateQuantity?: (index: number, delta: number) => void;
  onRemove?: (index: number) => void;
  title?: string;
  hideQuantityControls?: boolean;
}

export const CartList = React.memo(
  ({
    items,
    onUpdateQuantity,
    onRemove,
    title = "3. Carrito",
    hideQuantityControls = false,
  }: CartListProps) => {
    useRenderCount("CartList", { itemsCount: items.length });
    const { accentColor, textPrimary, textSecondary, accentOnSurface} = useAccentColor();

    const groupedItems = React.useMemo(() => {
      const ObjectGroups: Record<
        string,
        {
          id: number | string;
          name: string;
          precio: number;
          totalQty: number;
          badge: string | null;
          subItems: (CartItem & { originalIndex: number })[];
        }
      > = {};

      items.forEach((item, idx) => {
        const id = item.id || item.id_producto || idx;
        // Una misma presentación vendida de forma distinta (botella, shot de
        // cliente o shot de anfitriona) es un grupo aparte: cambia precio y reporte.
        const tipo = (item as any).tipo_venta === "shot" ? "shot" : "botella";
        const badge =
          tipo === "shot"
            ? (item as any).shot_anfitriona
              ? "Corto anfitriona"
              : "Corto cliente"
            : null;
        const key = JSON.stringify([
          id,
          tipo,
          (item as any).shot_anfitriona,
          item.precio,
          (item as any).comision,
          (item as any).acompanamiento_corto,
        ]);
        if (!ObjectGroups[key]) {
          ObjectGroups[key] = {
            id,
            name: item.nombre || "Producto",
            precio: item.precio || 0,
            totalQty: 0,
            badge,
            subItems: [],
          };
        }
        ObjectGroups[key].totalQty += item.quantity || item.cantidad || 1;
        ObjectGroups[key].subItems.push({ ...item, originalIndex: idx });
      });

      return Object.values(ObjectGroups);
    }, [items]);

    if (items.length === 0) return null;

    return (
      <View>
        {title ? (
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            {title}
          </Text>
        ) : null}
        {groupedItems.map((group, groupIdx) => (
          <View
            key={groupIdx}
            style={[
              styles.cartItem,
              { borderBottomColor: "rgba(155,155,155,0.1)" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.groupHeader}>
                <View style={styles.groupTitleRow}>
                  <Text style={[styles.itemName, { color: textPrimary }]}>
                    {group.name}
                    {"  "}
                    <Text style={{ fontWeight: "900", color: "#10B981" }}>
                      x{group.totalQty}
                    </Text>
                  </Text>
                  {group.badge && (
                    <View
                      style={[styles.saleBadge, { borderColor: accentColor }]}
                    >
                      <Text
                        style={[styles.saleBadgeText, { color: accentOnSurface }]}
                      >
                        {group.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.itemSub, { color: textSecondary }]}>
                  ${group.precio.toLocaleString()} c/u
                </Text>
              </View>

              <View style={styles.subItemsContainer}>
                {group.subItems.map((sub: any, sIdx: number) => (
                  <View key={sIdx} style={styles.subItemRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: sub.hostessNames ? accentColor : textSecondary,
                          fontWeight: "700",
                        }}
                      >
                        {sub.hostessNames
                          ? `Anfitrionas: ${sub.hostessNames}`
                          : "Sin anfitriona"}
                      </Text>
                    </View>

                    {!hideQuantityControls && (
                      <View style={styles.qtyControls}>
                        {onUpdateQuantity && (
                          <Pressable
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => {
                              haptic.tap();
                              onUpdateQuantity(sub.originalIndex, -1);
                            }}
                            style={styles.qtyBtn}
                            accessibilityLabel="Disminuir cantidad"
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name="remove"
                              size={18}
                              color={textPrimary}
                            />
                          </Pressable>
                        )}
                        <Text style={[styles.qtyText, { color: textPrimary, fontFamily: FontFamily.bold }]}>
                          {sub.quantity || sub.cantidad || 1}
                        </Text>
                        {onUpdateQuantity && (
                          <Pressable
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => {
                              haptic.tap();
                              onUpdateQuantity(sub.originalIndex, 1);
                            }}
                            style={styles.qtyBtn}
                            accessibilityLabel="Aumentar cantidad"
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name="add"
                              size={18}
                              color={textPrimary}
                            />
                          </Pressable>
                        )}
                        {onRemove && (
                          <Pressable
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => {
                              haptic.confirm();
                              onRemove(sub.originalIndex);
                            }}
                            style={[
                              styles.deleteBtnOnly,
                              {
                                backgroundColor: "rgba(239,68,68,0.12)",
                                marginLeft: 12,
                              },
                            ]}
                            accessibilityLabel="Eliminar producto"
                            accessibilityRole="button"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={18}
                              color="#EF4444"
                            />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  },
);
CartList.displayName = "CartList";

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 15,
    textTransform: "uppercase",
    opacity: 0.6,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemName: { fontSize: 15, fontWeight: "700" },
  itemSub: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(155,155,155,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: { marginHorizontal: 12, fontSize: 16 },
  deleteBtnOnly: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  groupHeader: { marginBottom: 8 },
  groupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  saleBadge: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saleBadgeText: { fontSize: 10, fontWeight: "900" },
  subItemsContainer: {
    paddingLeft: 8,
    marginTop: 4,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(155,155,155,0.2)",
  },
  subItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
});
