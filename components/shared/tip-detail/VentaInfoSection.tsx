import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";
import { useAccentColor } from "@/hooks/useAccentColor";

interface VentaInfoSectionProps {
  saleDetail: any;
}

export const VentaInfoSection: React.FC<VentaInfoSectionProps> = ({
  saleDetail,
}) => {
  const { accentColor, isDark } = useAccentColor();
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const borderColor = isDark ? `${accentColor}40` : "rgba(0,0,0,0.05)";

  if (!saleDetail) {
    return (
      <View style={{ padding: 30, alignItems: "center" }}>
        <Ionicons name="receipt-outline" size={40} color={textSecondary} />
        <Text
          style={{
            color: textSecondary,
            marginTop: 10,
            textAlign: "center",
            fontSize: 13,
          }}
        >
          Esta propina no tiene venta asociada
        </Text>
      </View>
    );
  }

  return (
    <>
      <Text
        style={[
          styles.sectionTitle,
          { color: textSecondary, marginTop: 20 },
        ]}
      >
        PERSONAL Y SERVICIO
      </Text>
      <View style={[styles.list, { borderColor }]}>
        <View
          style={[
            styles.row,
            { borderBottomColor: borderColor, borderBottomWidth: 1 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="storefront-outline" size={16} color={textSecondary} />
            <Text style={{ color: textSecondary, fontSize: 13 }}>Origen</Text>
          </View>
          <Text style={[styles.value, { color: textPrimary, fontSize: 13 }]}>
            {saleDetail.garzon_nombre || saleDetail.mesero_nombre
              ? `Pedido por ${saleDetail.garzon_nombre || saleDetail.mesero_nombre}`
              : "Venta realizada en barra"}
          </Text>
        </View>
        {saleDetail.cajero_nombre ? (
          <View
            style={[
              styles.row,
              { borderBottomColor: borderColor, borderBottomWidth: 1 },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="cash-outline" size={16} color={textSecondary} />
              <Text style={{ color: textSecondary, fontSize: 13 }}>
                Procesó la venta
              </Text>
            </View>
            <Text style={[styles.value, { color: textPrimary, fontSize: 13 }]}>
              {saleDetail.cajero_nombre}
            </Text>
          </View>
        ) : null}
        {saleDetail.habitacion_nombre ? (
          <View
            style={[
              styles.row,
              { borderBottomColor: borderColor, borderBottomWidth: 1 },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="bed-outline" size={16} color={textSecondary} />
              <Text style={{ color: textSecondary, fontSize: 13 }}>
                Habitación
              </Text>
            </View>
            <Text style={[styles.value, { color: textPrimary, fontSize: 13 }]}>
              {saleDetail.habitacion_nombre}
            </Text>
          </View>
        ) : null}
        {saleDetail.tiempo ? (
          <View
            style={[
              styles.row,
              {
                borderBottomColor: borderColor,
                borderBottomWidth:
                  (saleDetail.usuarios?.length ?? 0) > 0 ? 1 : 0,
              },
            ]}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="time-outline" size={16} color={textSecondary} />
              <Text style={{ color: textSecondary, fontSize: 13 }}>
                Tiempo
              </Text>
            </View>
            <Text style={[styles.value, { color: textPrimary, fontSize: 13 }]}>
              {saleDetail.tiempo} min
            </Text>
          </View>
        ) : null}
        {saleDetail.usuarios?.map(
          (u: any, idx: number, arr: any[]) => (
            <View
              key={idx}
              style={[
                styles.row,
                {
                  borderBottomColor: borderColor,
                  borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color={textSecondary}
                />
                <Text style={{ color: textSecondary, fontSize: 13 }}>
                  Anfitriona
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[styles.value, { color: textPrimary, fontSize: 13 }]}
                >
                  {u.usuario_nombre || u.nombre}
                </Text>
                {u.nick ? (
                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                    @{u.nick}
                  </Text>
                ) : null}
              </View>
            </View>
          ),
        )}
      </View>

      <Text
        style={[
          styles.sectionTitle,
          { color: textSecondary, marginTop: 20 },
        ]}
      >
        PRODUCTOS
      </Text>
      <View style={[styles.list, { borderColor }]}>
        {saleDetail.detalles?.map((det: any, idx: number) => (
          <View
            key={idx}
            style={[
              styles.row,
              {
                borderBottomColor: borderColor,
                borderBottomWidth:
                  idx === saleDetail.detalles.length - 1 ? 0 : 1,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: textPrimary }]}>
                {det.producto_nombre}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 12 }}>
                {det.cantidad} x $
                {Number(
                  det.precio ?? det.producto_precio ?? 0,
                ).toLocaleString()}
              </Text>
            </View>
            <Text style={[styles.value, { color: textPrimary }]}>
              $
              {Number(
                det.sub_total ?? det.subtotal ?? 0,
              ).toLocaleString()}
            </Text>
          </View>
        ))}
        <View style={[styles.totalRow, { borderTopColor: borderColor }]}>
          <Text style={[styles.totalLabel, { color: textSecondary }]}>
            Total Venta
          </Text>
          <Text style={[styles.totalValue, { color: textPrimary }]}>
            ${Number(saleDetail.total).toLocaleString()}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 15,
          padding: 12,
          borderRadius: 12,
          backgroundColor: isDark ? "#37415140" : "#F3F4F6",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <Text style={{ color: textSecondary, fontSize: 12 }}>
            Método de Pago
          </Text>
          <Text
            style={{
              color: textPrimary,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {String(saleDetail.metodo_pago ?? "").toUpperCase() || "---"}
          </Text>
        </View>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between" }}
        >
          <Text style={{ color: textSecondary, fontSize: 12 }}>Fecha</Text>
          <Text style={{ color: textPrimary, fontSize: 12 }}>
            {saleDetail.fecha_crea
              ? parseDateSafe(saleDetail.fecha_crea).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "---"}
          </Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  list: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  productName: { fontSize: 14, fontWeight: "700" },
  value: { fontSize: 14, fontWeight: "800" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 13, fontWeight: "800" },
  totalValue: { fontSize: 16, fontWeight: "900" },
});
