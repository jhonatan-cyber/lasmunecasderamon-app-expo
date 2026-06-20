import React from "react";
import { MotiView } from "moti";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";
import { rotateColor } from "@/utils/colors";
import { TimerPill } from "./TimerPill";
import { statusColors } from "./constants";
import { VentaCardDetails } from "./VentaCardDetails";
import { VentaCardRight } from "./VentaCardRight";
import type { Venta } from "./types";
import type { Timer } from "@/context/TimerContext";

type VentaCardProps = {
  item: Venta;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  onPress: (item: Venta) => void;
  onFinalizar: (item: Venta) => void;
  timers: Timer[];
  serverOffset: number;
  getVentaId: (item: Venta) => string | null;
};

export function VentaCard({
  item,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  onPress,
  onFinalizar,
  timers,
  serverOffset,
  getVentaId,
}: VentaCardProps) {
  const productCount = item.item_count || 0;
  const ventaId = getVentaId(item);
  const itemAccent = rotateColor(accentColor, ((Number(ventaId) || 0) % 10) * 36);
  const statusColor = item.estado === 2 ? itemAccent : statusColors[item.estado] || "#6B7280";

  const activeTimer = timers.find(
    (t) =>
      t.tipoTransaccion === "venta" &&
      (String(t.servicioId) === String(ventaId) ||
        (String(t.roomId) === String(item.habitacion_id) && item.estado === 2)),
  );

  const formatDateTime = (dateStr: string) =>
    parseDateSafe(dateStr).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400 }}
      style={{ marginHorizontal: 8 }}
    >
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            borderLeftColor: statusColor,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => onPress(item)}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeftContent}>
            <View style={styles.cardTopActions}>
              <Text style={[styles.cardCode, { color: textPrimary }]}>
                Codigo : {item.codigo}
              </Text>
            </View>

            <VentaCardDetails
              clienteNombre={item.cliente_nombre ?? undefined}
              habitacionNombre={item.habitacion_nombre ?? undefined}
              productCount={productCount}
              anfitrionasNicks={item.usuarios_nicks ?? undefined}
              fechaCrea={item.fecha_crea}
              accentColor={accentColor}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              formatDateTime={formatDateTime}
              renderTimer={activeTimer ? (
                <TimerPill
                  timer={activeTimer}
                  serverOffset={serverOffset}
                  accentColor={accentColor}
                  textSecondary={textSecondary}
                  textPrimary={textPrimary}
                />
              ) : undefined}
            />
          </View>

          <VentaCardRight
            estado={item.estado}
            metodoPago={item.metodo_pago}
            total={item.total}
            propina={item.propina}
            productCount={productCount}
            accentColor={accentColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onFinalizar={item.estado === 2 ? () => onFinalizar(item) : undefined}
          />
        </View>
      </Pressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    marginBottom: 22,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardMainRow: { flexDirection: "row", justifyContent: "space-between" },
  cardLeftContent: { flex: 1.2 },
  cardTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardCode: { fontSize: 17, fontWeight: "900", letterSpacing: -0.5 },
});
