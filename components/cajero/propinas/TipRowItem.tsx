import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { Propina } from "@/hooks/usePropinasScreen";
import { rotateColor } from "@/utils/colors";

interface TipRowItemProps {
  item: Propina;
  index: number;
  onPress: (item: Propina) => void;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;

  isDark: boolean;
  accentColor: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

export const TipRowItem: React.FC<TipRowItemProps> = ({
  item,
  index,
  onPress,
  formatDate,
  formatTime,
  isDark,
  accentColor,
  cardBg,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
  const isPendiente = item.estado === 1;
  const idNum =
    typeof item.id_detalle_propina === "string"
      ? item.id_detalle_propina.split("-").pop()?.substring(0, 2)
      : item.id_detalle_propina;
  const itemAccent = rotateColor(
    accentColor,
    ((Number(idNum) || index) % 10) * 36,
  );

  return (
    <MotiView
      from={{ opacity: 0, translateY: 30 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", delay: index * 100 }}
    >
      <Pressable onPress={() => onPress(item)}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.indexBadge,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            >
              <Text style={[styles.indexText, { color: textPrimary }]}>
                {index + 1}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {item.codigo_venta ? (
                <View
                  style={[
                    styles.ventaBadge,
                    { backgroundColor: isDark ? "#1E3A5F" : "#DBEAFE" },
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={12}
                    color={isDark ? "#93C5FD" : "#1E40AF"}
                  />
                  <Text
                    style={[
                      styles.ventaText,
                      { color: isDark ? "#93C5FD" : "#1E40AF" },
                    ]}
                  >
                    Código: {item.codigo_venta}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isPendiente
                      ? isDark
                        ? "rgba(16, 185, 129, 0.2)"
                        : "#D1FAE5"
                      : isDark
                        ? "rgba(59, 130, 246, 0.2)"
                        : "#DBEAFE",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isPendiente
                        ? isDark
                          ? "#10B981"
                          : "#065F46"
                        : isDark
                          ? "#3B82F6"
                          : "#1E40AF",
                    },
                  ]}
                >
                  {isPendiente ? "Por cobrar" : "Cobrada"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.dateRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={textSecondary}
              />
              <Text style={[styles.dateText, { color: textPrimary }]}>
                {formatDate(item.fecha_crea)}
              </Text>
              <Text style={[styles.timeText, { color: textSecondary }]}>
                {formatTime(item.fecha_crea)}
              </Text>
            </View>

            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: textSecondary }]}>
                Mi parte
              </Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: isPendiente ? itemAccent : accentColor },
                ]}
              >
                ${(item.monto || 0).toLocaleString()}
              </Text>
            </View>

            {item.propina_fecha_crea && item.estado === 0 ? (
              <View style={styles.paymentRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={accentColor}
                />
                <Text style={[styles.paymentText, { color: textSecondary }]}>
                  Pagada: {formatDate(item.propina_fecha_crea)}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                marginTop: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{ color: accentColor, fontSize: 11, fontWeight: "700" }}
              >
                Ver detalles de venta
              </Text>
              <Ionicons name="chevron-forward" size={12} color={accentColor} />
            </View>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  indexText: { fontSize: 14, fontWeight: "700" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  ventaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  ventaText: { fontSize: 11, fontWeight: "600" },
  cardBody: {},
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dateText: { fontSize: 14 },
  timeText: { fontSize: 13, marginLeft: 6 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 14, fontWeight: "600" },
  amountValue: { fontSize: 20, fontWeight: "800" },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  paymentText: { fontSize: 12 },
});
