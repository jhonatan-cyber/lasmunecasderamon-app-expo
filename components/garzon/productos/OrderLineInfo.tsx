import { Text, View } from "react-native";
import type { Anfitriona, CartItem, Room } from "@/types/cart";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useConfigValue } from "@/hooks/useConfigValue";
import { normalizarAcompanamientoBotella } from "@/hooks/utils/productConfiguration";
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
      : undefined;
  const saboresBotella =
    product.tipo_venta === "shot"
      ? []
      : normalizarAcompanamientoBotella(product.acompanamiento_botella);
  const mixerQuantity = Number(mixer?.ml_por_corto ?? mixer?.unidades ?? 0);
  const unit = mixer?.ml_por_corto !== undefined ? "ml" : "unidades";
  const stockBar = Number(product.stock_bar) || 0;
  const mlAbierta = Number(product.ml_abierta) || 0;
  const stockParts = [
    stockBar > 0 ? `${stockBar} unidades` : null,
    mlAbierta > 0 ? `${mlAbierta} ml abiertos` : null,
  ].filter((part): part is string => !!part);
  const commissionTotal = (Number(product.commission) || 0) * item.quantity;
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
            {item.quantity > 0 ? ` · ${item.quantity} unidades` : ""}
          </Text>
        </View>
      </View>
      {item.quantity > 0 && (
        <Text style={{ color: textSecondary }}>
          Consumo:{" "}
          {product.tipo_venta === "shot"
            ? `${shotMl * item.quantity} ml (${shotMl} ml por corto)`
            : `${item.quantity} unidades`}
        </Text>
      )}
      {stockParts.length > 0 && (
        <Text style={{ color: textSecondary }}>
          Stock en bar: {stockParts.join(" · ")}
        </Text>
      )}
      <Text style={{ color: textSecondary }}>
        Precio por unidad: {money(product.price)}
        {commissionTotal > 0
          ? ` · Comisión total: ${money(commissionTotal)}`
          : ""}
      </Text>
      {item.selectedHostesses.length > 0 && (
        <Text style={{ color: textPrimary }}>
          Anfitrionas:{" "}
          {item.selectedHostesses
            .map(
              (id) =>
                anfitrionas.find((hostess) => String(hostess.id) === String(id))
                  ?.nick || String(id),
            )
            .join(", ")}
        </Text>
      )}
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
              {mixerQuantity} {unit} por corto
            </Text>
            <Text style={{ color: textPrimary }}>
              Bebida total: {mixerQuantity * item.quantity} {unit}
            </Text>
          </View>
        </View>
      )}
      {saboresBotella.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: textSecondary }}>
            Acompañamiento por botella (
            {saboresBotella.reduce((sum, sabor) => sum + sabor.unidades, 0)}{" "}
            unidades por botella)
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
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: textPrimary }}>
                  {sabor.nombre || sabor.presentacion_id}
                </Text>
                <Text style={{ color: textSecondary }}>
                  {sabor.unidades} unidades por botella · total{" "}
                  {sabor.unidades * item.quantity}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      {item.quantity > 0 && (
        <Text style={{ color: "#10B981", fontWeight: "800", fontSize: 18 }}>
          Subtotal: {money(product.price * item.quantity)}
        </Text>
      )}
    </View>
  );
}
