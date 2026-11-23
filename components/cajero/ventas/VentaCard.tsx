import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { parseDateSafe } from "@/utils/timeUtils";
import { rotateColor } from "@/utils/colors";
import { useRenderCount } from "@/hooks/useRenderCount";
import { FontFamily } from "@/constants/fonts";
import { BorderRadius } from "@/constants/spacing";
import { TimerPill } from "./TimerPill";
import { statusColors } from "./constants";
import { VentaCardDetails } from "./VentaCardDetails";
import { VentaCardRight } from "./VentaCardRight";
import type { Venta } from "./types";
import type { Timer } from "@/context/types";

type VentaCardProps = {
  item: Venta;
  accentColor: string;
  cardBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
  onPress: (item: Venta) => void;
  onFinalizar?: (item: Venta) => void;
  timers: Timer[];
  serverOffset: number;
  getVentaId: (item: Venta) => string | null;
};

// Buscar/filtrar entrega las mismas referencias de venta: sin `memo` cada tecla
// repintaba todas las tarjetas visibles. El contador sigue avanzando porque
// `TimerPill` se suscribe por su cuenta al tick.
// Sin animación de entrada: el historial monta hasta 50 tarjetas y FlatList
// recicla las visibles al desplazar, así que un fade desde opacity 0 dejaba
// las filas en blanco mientras se recorrían.
export const VentaCard = memo(function VentaCard({
  item,
  accentColor,
  cardBg,
  borderColor,
  textPrimary,
  textSecondary,
  isDark,
  onPress,
  onFinalizar,
  timers,
  serverOffset,
  getVentaId,
}: VentaCardProps) {
  useRenderCount('VentaCard', { ventaId: getVentaId(item), estado: item.estado });
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

  // Glow neón en modo oscuro con el color rotado
  const cardNeonGlow = isDark ? {
    shadowColor: itemAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } : {};

  return (
    <View style={{ marginHorizontal: 8 }}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor,
            borderLeftColor: statusColor,
            ...cardNeonGlow,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => onPress(item)}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.cardLeftContent}>
            <View style={styles.cardTopActions}>
              <Text style={[styles.cardCode, { color: textPrimary }]}>
                Código: {item.codigo}
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
            onFinalizar={item.estado === 2 && onFinalizar ? () => onFinalizar(item) : undefined}
          />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.card,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardMainRow: { flexDirection: "row", justifyContent: "space-between" },
  cardLeftContent: { flex: 1.2 },
  cardTopActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardCode: { fontSize: 17, fontFamily: FontFamily.bold, letterSpacing: -0.5 },
});
