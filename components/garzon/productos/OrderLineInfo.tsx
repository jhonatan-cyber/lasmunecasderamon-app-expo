import { Text, View } from "react-native";
import { FontFamily } from '@/constants/fonts';
import type { CartItem } from "@/types/cart";
import { useAccentColor } from "@/hooks/useAccentColor";
import { normalizarAcompanamientoBotella } from "@/hooks/utils/productConfiguration";
import { OrderProductPhoto } from "@/components/shared/OrderProductPhoto";

export function OrderLineInfo({
  item,
}: {
  item: CartItem;
}) {
  const { textPrimary, textSecondary } = useAccentColor();
  const product = item.product;
  const money = (amount: number) =>
    `$${Math.round(amount).toLocaleString("es-CL")}`;
  const commissionTotal = (Number(product.commission) || 0) * item.quantity;
  const saboresBotella =
    product.tipo_venta === "shot"
      ? []
      : normalizarAcompanamientoBotella(
          product.acompanamiento_botella,
        ).filter((sabor) => sabor.unidades > 0);
  const totalPorBotella = saboresBotella.reduce(
    (sum, sabor) => sum + sabor.unidades,
    0,
  );
  const { accentOnSurface } = useAccentColor();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <OrderProductPhoto foto={product.foto} name={product.name} />
        <View style={{ flex: 1, gap: 3 }}>
          {!!product.categoria && (
            <Text style={{ color: textSecondary, fontSize: 12 }}>
              {product.categoria}
            </Text>
          )}
          <Text style={{ color: textPrimary, fontFamily: FontFamily.extrabold }}>
            {product.producto_nombre || product.name}
          </Text>
          {!!product.presentacion_nombre && (
            <Text style={{ color: textSecondary }}>
              {product.presentacion_nombre}
            </Text>
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {product.stock_bar !== undefined && product.stock_bar !== null && (
          <View style={{ backgroundColor: accentOnSurface + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ color: accentOnSurface, fontFamily: FontFamily.medium, fontSize: 13 }}>
              Stock: {product.stock_bar}
            </Text>
          </View>
        )}
        <View style={{ backgroundColor: accentOnSurface + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
          <Text style={{ color: accentOnSurface, fontFamily: FontFamily.medium, fontSize: 13 }}>
            Precio c/u: {money(product.price)}
          </Text>
        </View>
        {commissionTotal > 0 && (
          <View style={{ backgroundColor: accentOnSurface + '18', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ color: accentOnSurface, fontFamily: FontFamily.medium, fontSize: 13 }}>
              Comisión: {money(commissionTotal)}
            </Text>
          </View>
        )}
      </View>
      {saboresBotella.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: textSecondary, fontFamily: FontFamily.medium, fontSize: 12 }}>
            Acompañamiento por botella ({totalPorBotella} unidades por botella)
          </Text>
          {saboresBotella.map((sabor) => (
            <View
              key={sabor.presentacion_id}
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <OrderProductPhoto
                foto={sabor.foto}
                name={sabor.nombre || "Bebida"}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: textPrimary }}>
                  {sabor.nombre || sabor.presentacion_id}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 12 }}>
                  {sabor.unidades} unidades por botella · total{" "}
                  {sabor.unidades * item.quantity}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
