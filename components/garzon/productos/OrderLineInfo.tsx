import { Text, View } from "react-native";
import type { Anfitriona, CartItem, Room } from "@/types/cart";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useConfigValue } from "@/hooks/useConfigValue";
import { OrderProductPhoto } from "@/components/shared/OrderProductPhoto";

export function OrderLineInfo({
  item,
  anfitrionas,
  rooms,
}: {
  item: CartItem;
  anfitrionas: Anfitriona[];
  rooms: Room[];
}) {
  const { textPrimary, textSecondary } = useAccentColor();
  const defaultMl = Number(useConfigValue("bar", "shot_ml", "50"));
  const product = item.product;
  const money = (amount: number) =>
    `$${Math.round(amount).toLocaleString("es-CL")}`;
  const shotMl =
    product.shot_anfitriona && Number(product.ml_shot_anfitriona) > 0
      ? Number(product.ml_shot_anfitriona)
      : Number(product.ml_shot) || defaultMl;
  const mixer:
    | {
        presentacion_id: string;
        nombre?: string;
        foto?: string;
        unidades?: number;
        ml_por_corto?: number;
      }
    | undefined =
    product.tipo_venta === "shot"
      ? product.acompanamiento_corto
      : product.acompanamiento_botella;
  const mixerQuantity = Number(mixer?.ml_por_corto ?? mixer?.unidades ?? 0);
  const unit = mixer?.ml_por_corto !== undefined ? "ml" : "unidades";
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <OrderProductPhoto foto={product.foto} name={product.name} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: textSecondary, fontSize: 12 }}>
            {product.categoria}
          </Text>
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
              : "Botella"}{" "}
            · {item.quantity} unidades
          </Text>
        </View>
      </View>
      <Text style={{ color: textSecondary }}>
        Consumo:{" "}
        {product.tipo_venta === "shot"
          ? `${shotMl * item.quantity} ml (${shotMl} ml por corto)`
          : `${item.quantity} unidades`}
      </Text>
      {product.stock_bar !== undefined && (
        <Text style={{ color: textSecondary }}>
          Stock en bar: {product.stock_bar} unidades · {product.ml_abierta || 0}{" "}
          ml abiertos
        </Text>
      )}
      <Text style={{ color: textSecondary }}>
        Precio por unidad: {money(product.price)} · Comisión total:{" "}
        {money((product.commission || 0) * item.quantity)}
      </Text>
      <Text style={{ color: textPrimary }}>
        Anfitrionas:{" "}
        {item.selectedHostesses
          .map(
            (id) =>
              anfitrionas.find((hostess) => String(hostess.id) === String(id))
                ?.nick || String(id),
          )
          .join(", ") || "Sin asignación"}
      </Text>
      {!!item.selectedRoom && (
        <Text style={{ color: textSecondary }}>
          Habitación:{" "}
          {rooms.find((room) => String(room.id) === String(item.selectedRoom))
            ?.name || item.selectedRoom}
        </Text>
      )}
      {!!mixer && (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <OrderProductPhoto
            foto={mixer.foto}
            name={mixer.nombre || "Bebida"}
          />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: textPrimary }}>
              {mixer.nombre || mixer.presentacion_id}
            </Text>
            <Text style={{ color: textSecondary }}>
              {mixerQuantity} {unit} por{" "}
              {product.tipo_venta === "shot" ? "corto" : "botella"}
            </Text>
            <Text style={{ color: textPrimary }}>
              Bebida total: {mixerQuantity * item.quantity} {unit}
            </Text>
          </View>
        </View>
      )}
      <Text style={{ color: "#10B981", fontWeight: "800", fontSize: 18 }}>
        Subtotal: {money(product.price * item.quantity)}
      </Text>
    </View>
  );
}
